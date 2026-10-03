export function cosineSimilarity(
    vectorA: number[],
    vectorB: number[],
  ): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error("Vectors must have the same length");
    }
  
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
  
    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
  
      magnitudeA += vectorA[i] * vectorA[i];
  
      magnitudeB += vectorB[i] * vectorB[i];
    }
  
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }
  
    return (
      dotProduct /
      (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB))
    );
  }