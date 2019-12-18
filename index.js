const RMLMapperWrapper = require('@rmlio/rmlmapper-java-wrapper');
const fs = require('fs-extra');
const jsonld = require('jsonld');
const cheerio = require('cheerio');
const https = require('https');

const rmlmapperPath = './rmlmapper.jar';
const tempFolderPath = './tmp';

async function getBookDetails(url) {
  const html = await getHTML(url);

  if (url.indexOf('kobo.com') !== -1) {

  } else if (url.indexOf('apple.com') !== -1) {
    return await getAppleDetails(html);
  } else {
    throw new Error('Book provider is not supported.');
  }
}

async function getAppleDetails(html) {
  const $html = cheerio.load(html);
  const json = $html('#shoebox-ember-data-store').html();
  //console.log(json);

  const wrapper = new RMLMapperWrapper(rmlmapperPath, tempFolderPath, true);
  const rml = fs.readFileSync('./apple-books.rml.ttl', 'utf-8');
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

  fs.remove(tempFolderPath);

  return framed;
}

function getHTML(url) {
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
        resolve(html);
      });
    }).on('error', (e) => {
      reject(e);
    });
  }));
}

module.exports = getBookDetails;