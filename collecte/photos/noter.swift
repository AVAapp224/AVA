// Note les photos des articles avec les outils d'analyse d'image intégrés à macOS (Vision).
// Pour chaque fichier donné : la part de l'image occupée par le plus grand visage (gros plan ou non)
// et une note esthétique (de -1 à 1). Sortie : une ligne JSON par photo.
import Foundation
import Vision
import ImageIO

// netteté : variance du contour (laplacien) sur la photo réduite en gris ; une photo floue a des contours mous, donc une variance faible
func nettete(_ img: CGImage) -> Double {
    let w = img.width, h = img.height
    guard w > 2, h > 2 else { return 0 }
    var px = [UInt8](repeating: 0, count: w * h)
    let ok = px.withUnsafeMutableBytes { tampon -> Bool in
        guard let ctx = CGContext(data: tampon.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w,
                                  space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue) else { return false }
        ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
        return true
    }
    guard ok else { return 0 }
    // la photo est découpée en 6 × 6 cases ; on garde la 2e case la plus nette (le sujet), pour ne pas punir un flou d'arrière-plan voulu
    let cases = 6
    var s = [Double](repeating: 0, count: cases * cases), s2 = s, n = s
    for y in 1..<(h - 1) {
        let cy = min(cases - 1, y * cases / h)
        for x in 1..<(w - 1) {
            let i = y * w + x
            let l = 4 * Double(px[i]) - Double(px[i - 1]) - Double(px[i + 1]) - Double(px[i - w]) - Double(px[i + w])
            let c = cy * cases + min(cases - 1, x * cases / w)
            s[c] += l; s2[c] += l * l; n[c] += 1
        }
    }
    let variances = (0..<(cases * cases)).filter { n[$0] > 0 }.map { k -> Double in let m = s[k] / n[k]; return s2[k] / n[k] - m * m }.sorted(by: >)
    return variances.count > 1 ? variances[1] : (variances.first ?? 0)
}

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
    print("{\"fichier\":\"\(chemin)\",\"visage\":\(plusGrand),\"visages\":\(surfaces.count),\"beaute\":\(note),\"utilitaire\":\(utilitaire),\"largeur\":\(largeur),\"hauteur\":\(hauteur),\"nettete\":\(Int(nettete(image)))}")
}
