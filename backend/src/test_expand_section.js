import 'dotenv/config';
import { expandNodeSection } from './agents/node_expander.js';

const nodeId = process.argv[2]; // e.g., node UUID
const section = process.argv[3]; // e.g., "Background"

async function main() {
  if (!nodeId || !section) {
    console.error('❌ Usage: node src/test_expand_section.js <nodeId> <SectionName>');
    process.exit(1);
  }

  try {
    console.log(`🚀 Expanding section "${section}" for node ${nodeId}`);
    const result = await expandNodeSection(nodeId, section);
    console.log('\n✅ Expansion complete:');
    console.dir(result, { depth: 3 });
  } catch (err) {
    console.error('\n❌ Expansion failed:', err.message);
  }
}

main();
