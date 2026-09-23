const PSD = require('psd');
const path = require('path');

PSD.open("1.psd").then(function (psd) {
    psd.parse();

    psd.tree().descendants().forEach(function (node) {
        if (node.isGroup()) return;
        
        if (node.name === '#BecauseCholesterolMatters') {
             const outPath = path.join(__dirname, 'public', `psd_hashtag_text.png`);
             node.saveAsPng(outPath).then(() => {
                 console.log(`Saved ${node.name}`);
             }).catch((e) => {});
        }
        if (node.name === 'Layer 9') {
             const outPath = path.join(__dirname, 'public', `psd_hashtag_bg.png`);
             node.saveAsPng(outPath).then(() => {
                 console.log(`Saved ${node.name}`);
             }).catch((e) => {});
        }
    });
}).catch(console.error);
