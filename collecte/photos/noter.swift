// Note les photos des articles avec les outils d'analyse d'image intégrés à macOS (Vision).
// Pour chaque fichier donné : la part de l'image occupée par le plus grand visage (gros plan ou non)
// et une note esthétique (de -1 à 1). Sortie : une ligne JSON par photo.
import Foundation
import Vision
import ImageIO

for chemin in CommandLine.arguments.dropFirst() {
    let url = URL(fileURLWithPath: chemin) as CFURL
    guard let source = CGImageSourceCreateWithURL(url, nil),
          let image = CGImageSourceCreateThumbnailAtIndex(source, 0, [
              kCGImageSourceCreateThumbnailFromImageAlways: true,
              kCGImageSourceThumbnailMaxPixelSize: 640,
              kCGImageSourceCreateThumbnailWithTransform: true] as CFDictionary) else {
        print("{\"fichier\":\"\(chemin)\",\"erreur\":true}")
        continue
    }
    // vraie taille de la photo (l'analyse se fait sur une version réduite, plus rapide)
    let proprietes = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any]
    let largeur = proprietes?[kCGImagePropertyPixelWidth] as? Int ?? image.width
    let hauteur = proprietes?[kCGImagePropertyPixelHeight] as? Int ?? image.height
    let visages = VNDetectFaceRectanglesRequest()
    let beaute = VNCalculateImageAestheticsScoresRequest()
    let analyse = VNImageRequestHandler(cgImage: image, options: [:])
    try? analyse.perform([visages, beaute])
    let surfaces = (visages.results ?? []).map { Double($0.boundingBox.width * $0.boundingBox.height) }
    let plusGrand = surfaces.max() ?? 0
    let note = beaute.results?.first.map { Double($0.overallScore) } ?? 0
    let utilitaire = beaute.results?.first?.isUtility ?? false
    print("{\"fichier\":\"\(chemin)\",\"visage\":\(plusGrand),\"visages\":\(surfaces.count),\"beaute\":\(note),\"utilitaire\":\(utilitaire),\"largeur\":\(largeur),\"hauteur\":\(hauteur)}")
}
