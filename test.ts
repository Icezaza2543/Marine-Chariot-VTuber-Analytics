import { loadMarineData } from './src/data/loadMarineData'
loadMarineData().then(records => {
  const types = new Set(records.map(r => r.contentType));
  console.log([...types]);
})
