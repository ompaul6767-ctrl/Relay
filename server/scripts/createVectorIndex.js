import mongoose from 'mongoose';
import { env } from '../src/config/environment.js';

/**
 * Script to create Atlas Vector Search index on the 'claims' collection.
 * Required by Hackathon Round 3 (Improvement 2 Part B).
 *
 * Index definition includes:
 * - vector field: 'embedding' (768 dimensions for text-embedding-004, cosine similarity)
 * - filter fields: 'caseId', 'acl', 'reviewDecision' (enforcing strict server-side pre-filtering)
 */
async function createVectorIndex() {
  console.log('===============================================================');
  console.log('🚀 RELAY ATLAS VECTOR SEARCH INDEX PROVISIONING');
  console.log('===============================================================');

  if (!env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in environment variables.');
    process.exit(1);
  }

  try {
    console.log('[Atlas] Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    console.log('✓ Connected to MongoDB cluster successfully.');

    const db = mongoose.connection.db;
    const collection = db.collection('claims');

    const indexDefinition = {
      name: 'claim_vector_index',
      type: 'vectorSearch',
      definition: {
        fields: [
          {
            type: 'vector',
            path: 'embedding',
            numDimensions: 768,
            similarity: 'cosine',
          },
          {
            type: 'filter',
            path: 'caseId',
          },
          {
            type: 'filter',
            path: 'acl',
          },
          {
            type: 'filter',
            path: 'reviewDecision',
          },
        ],
      },
    };

    console.log('\n[Atlas] Target Vector Index Definition:');
    console.log(JSON.stringify(indexDefinition, null, 2));

    try {
      console.log('\n[Atlas] Creating Search Index via MongoDB Driver API...');
      const result = await collection.createSearchIndex(indexDefinition);
      console.log(`✅ Search index creation initiated! Index name: "${result}"`);
      console.log('Note: Atlas Vector Search indexes can take 1-3 minutes to build in background.');
    } catch (driverErr) {
      if (driverErr.codeName === 'CommandNotFound' || driverErr.message?.includes('no such command')) {
        console.log('\nℹ️ Database does not support search index command directly (e.g. local or non-Atlas cluster).');
        console.log('To create in MongoDB Atlas UI manually:');
        console.log('1. Open Atlas Console -> Clusters -> Database Deployments');
        console.log('2. Click on "Atlas Search" -> "Create Search Index"');
        console.log('3. Select "Atlas Vector Search" (JSON Editor)');
        console.log('4. Select database "relay" and collection "claims"');
        console.log('5. Paste the definition above and name it "claim_vector_index"');
      } else if (driverErr.message?.includes('already exists') || driverErr.code === 68) {
        console.log('✓ Atlas Vector Search index "claim_vector_index" already exists.');
      } else {
        console.warn('⚠️ Atlas API notice:', driverErr.message);
      }
    }

    console.log('\n===============================================================');
    console.log('✓ Vector index setup check completed.');
    console.log('===============================================================');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during index creation:', err.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

createVectorIndex();
