import { analyzeNodeWithGemini } from './gemini_analysis.js';
import { getDoc } from 'firebase/firestore';

async function expandNode(nodeId) {
  // 1️⃣ Fetch node from Firestore
  const nodeRef = doc(db, 'nodes', nodeId);
  const nodeSnap = await getDoc(nodeRef);
  const nodeData = nodeSnap.data();

  // 2️⃣ Get markdown content
  const textForAnalysis = nodeData.markdownContent || nodeData.summary;

  // 3️⃣ Analyze with Gemini
  const analysis = await analyzeNodeWithGemini(textForAnalysis);

  // 4️⃣ Store sections + keywords back in Firestore
  await updateDoc(nodeRef, {
    sections: analysis.sections,
    keywords: analysis.keywords,
    analyzedAt: analysis.analyzedAt,
  });

  return analysis;
}
