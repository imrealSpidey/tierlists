const { MongoClient } = require('mongodb');
console.log('URI:', process.env.MONGODB_URI ? 'Exists' : 'Missing');
const c = new MongoClient(process.env.MONGODB_URI);
c.connect()
  .then(() => c.db('tierlive').collection('guildconfigs').find().toArray())
  .then(d => { console.log('GUILD CONFIGS:', d); process.exit(0); })
  .catch(console.error);
