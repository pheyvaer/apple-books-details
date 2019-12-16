const RMLMapperWrapper = require('@rmlio/rmlmapper-java-wrapper');
const fs = require('fs-extra');
const jsonld = require('jsonld');
const cheerio = require('cheerio');
const https = require('https');

const rmlmapperPath = './rmlmapper.jar';
const tempFolderPath = './tmp';

async function getBookDetails(url) {
  return new Promise(((resolve, reject) => {
    https.get(url, (res) => {
      const {statusCode} = res;

      let error;
      if (statusCode !== 200) {
        error = new Error(`Request Failed. Status Code: ${statusCode}`);
        reject(error);
        // Consume response data to free up memory
        res.resume();
        return;
      }

      res.setEncoding('utf8');

      let html = '';

      res.on('data', (chunk) => {
        html += chunk;
      });

      res.on('end', async () => {
        const $html = cheerio.load(html);
        const json = $html('#shoebox-ember-data-store').html();
        //console.log(json);

        const wrapper = new RMLMapperWrapper(rmlmapperPath, tempFolderPath, true);
        const rml = fs.readFileSync('./mapping.rml.ttl', 'utf-8');
        const sources = {
          'data.json': json
        };

        const result = await wrapper.execute(rml, {sources, generateMetadata: false, serialization: 'jsonld'});
        const framed = await jsonld.frame(JSON.parse(result.output), {
          "@context": "http://schema.org/",
          "@type": "Book",
          "offers": {
            "@type": "Offer"
          }
        });

        resolve(framed);
        fs.remove(tempFolderPath);
      });
    }).on('error', (e) => {
      reject(e);
      fs.remove(tempFolderPath);
    });
  }));
}

module.exports = getBookDetails;