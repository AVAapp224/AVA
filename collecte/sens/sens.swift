// Comprend le sens des articles avec l'analyse de texte intégrée à macOS (NaturalLanguage).
//
// sens vecteurs <sortie.bin>
//   Entrée (stdin) : une ligne par texte « langue<TAB>texte ».
//   Sortie : un fichier binaire de vecteurs float32 (DIM nombres par texte), dans le même ordre.
//   Le modèle est multilingue : un article anglais et un article français sur le même thème
//   ont des vecteurs proches.
//
// sens voisins <articles.bin> <exemples.bin> <K> <sortie.txt>
//   Pour chaque article, les K exemples les plus proches par le sens (« indice:similarité » séparés
//   par des espaces, une ligne par article). Les vecteurs sont recentrés sur la moyenne des articles
//   pour mieux faire ressortir ce qui distingue les sujets.
import Foundation
import NaturalLanguage

func erreur(_ m: String) -> Never { FileHandle.standardError.write((m + "\n").data(using: .utf8)!); exit(2) }
let args = CommandLine.arguments
guard args.count >= 3 else { erreur("usage: sens vecteurs <sortie.bin> | sens voisins <articles.bin> <exemples.bin> <K> <sortie.txt>") }
let DIM = 512

func vecteurs(_ chemin: String) throws {
  guard let modele = NLContextualEmbedding(language: .french) else { erreur("modele-absent") }
  if !modele.hasAvailableAssets {
    let fini = DispatchSemaphore(value: 0)
    modele.requestAssets { _, _ in fini.signal() }
    fini.wait()
  }
  try modele.load()
  guard modele.dimension == DIM else { erreur("dimension inattendue \(modele.dimension)") }
  let langues: [String: NLLanguage] = ["fr": .french, "en": .english, "es": .spanish, "de": .german, "it": .italian, "pt": .portuguese]
  var sortie = Data()
  var n = 0
  while let ligne = readLine() {
    let morceaux = ligne.split(separator: "\t", maxSplits: 1, omittingEmptySubsequences: false)
    let langue = langues[String(morceaux.first ?? "fr")] ?? .english
    let texte = morceaux.count > 1 ? String(morceaux[1]) : ""
    var v = [Float](repeating: 0, count: DIM)
    if !texte.isEmpty, let r = try? modele.embeddingResult(for: texte, language: langue) {
      r.enumerateTokenVectors(in: texte.startIndex..<texte.endIndex) { x, _ in
        for i in 0..<min(DIM, x.count) { v[i] += Float(x[i]) }
        return true
      }
      let norme = sqrt(v.reduce(0) { $0 + $1 * $1 })
      if norme > 0 { v = v.map { $0 / norme } }
    }
    v.withUnsafeBufferPointer { sortie.append(Data(buffer: $0)) }
    n += 1
  }
  try sortie.write(to: URL(fileURLWithPath: chemin))
  print("\(n) \(DIM)")
}

func lire(_ chemin: String) -> [[Float]] {
  guard let d = FileManager.default.contents(atPath: chemin) else { erreur("lecture impossible \(chemin)") }
  let tous = d.withUnsafeBytes { Array($0.bindMemory(to: Float.self)) }
  return stride(from: 0, to: tous.count, by: DIM).map { Array(tous[$0..<$0 + DIM]) }
}

func recentrer(_ vs: inout [[Float]], _ moyenne: [Float]) {
  for k in vs.indices {
    var v = vs[k]
    for i in 0..<DIM { v[i] -= moyenne[i] }
    let norme = sqrt(v.reduce(0) { $0 + $1 * $1 })
    if norme > 0 { for i in 0..<DIM { v[i] /= norme } }
    vs[k] = v
  }
}

func voisins(_ cheminArticles: String, _ cheminExemples: String, _ K: Int, _ sortie: String) throws {
  var A = lire(cheminArticles), E = lire(cheminExemples)
  var moyenne = [Float](repeating: 0, count: DIM)
  for v in A { for i in 0..<DIM { moyenne[i] += v[i] } }
  for i in 0..<DIM { moyenne[i] /= Float(max(1, A.count)) }
  recentrer(&A, moyenne)
  recentrer(&E, moyenne)
  var lignes = [String]()
  lignes.reserveCapacity(A.count)
  for a in A {
    var meilleurs = [(Float, Int)]()
    for (j, e) in E.enumerated() {
      var s: Float = 0
      for i in 0..<DIM { s += a[i] * e[i] }
      if meilleurs.count < K { meilleurs.append((s, j)); meilleurs.sort { $0.0 > $1.0 } }
      else if s > meilleurs[K - 1].0 { meilleurs[K - 1] = (s, j); meilleurs.sort { $0.0 > $1.0 } }
    }
    lignes.append(meilleurs.map { "\($0.1):\(String(format: "%.4f", $0.0))" }.joined(separator: " "))
  }
  try (lignes.joined(separator: "\n") + "\n").write(toFile: sortie, atomically: true, encoding: .utf8)
  print("\(A.count) articles, \(E.count) exemples")
}

do {
  switch args[1] {
  case "vecteurs": try vecteurs(args[2])
  case "voisins":
    guard args.count == 6, let k = Int(args[4]) else { erreur("usage: sens voisins <articles.bin> <exemples.bin> <K> <sortie.txt>") }
    try voisins(args[2], args[3], k, args[5])
  default: erreur("commande inconnue")
  }
} catch { erreur("\(error)") }
