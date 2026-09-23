const fs = require('fs');
function analyze(path) {
  console.log('Analyzing:', path);
  const buf = fs.readFileSync(path);
  console.log('File size (bytes):', buf.length);
  const len = buf.length;
  let i = 0;
  while(i < len) {
    if(buf[i]===0xFF && (buf[i+1]===0xC0 || buf[i+1]===0xC2)) {
      const h = buf.readUInt16BE(i+5);
      const w = buf.readUInt16BE(i+7);
      console.log(`Marker ${buf[i+1].toString(16)} -> Width: ${w}, Height: ${h}`);
    }
    i++;
  }
}
analyze('public/1.jpg');
analyze('C:\\Users\\softs\\Desktop\\Projects22\\PSN Updated\\Neurologyupdate\\1.JPG');
