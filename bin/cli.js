#!/usr/bin/env node

const getBookDetails = require('../index');
const program = require('commander');
const fs = require('fs');

let urls = [];

main();

async function main() {
  program.option('-u, --url <url>', 'Apple Books URL. Reuse this option for multiple URLs', collect, []);
  program.option('-f, --file <path>', 'File with one URL per line', processFile);
  program.option('-s, --sort <order>', 'Order books either asc or desc (only for CSV)', 'asc');
  program.option('-c, --csv', 'Print as CSV');
  program.parse(process.argv);

  urls = urls.concat(program.url);

  if (urls.length !== 0) {
    const results = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];

      if (url !== '') {
        try {
          const data = await getBookDetails(url);
          results.push(data);
        } catch (e) {
          console.error(`Error for ${url} ${e.message}`);
        }
      }
    }

    if (program.csv) {
      const order = program.sort || 'asc';
      printAsCSV(results, order);
    } else {
      printAsJSON(results);
    }
  } else {
    console.error('Please provide at least one url. Use -h for more information.');
  }
}

function collect(value, previous) {
  if (!previous) {
    previous = [];
  }

  return previous.concat([value]);
}

function printAsJSON(books) {
  books.forEach(async book => {
    console.log(JSON.stringify(book, null, 2));
  });
}

function printAsCSV(books, order) {
  books.sort((a, b) => {
    a = parseFloat(a['@graph'][0].offers.price.replace(',', '.'));
    b = parseFloat(b['@graph'][0].offers.price.replace(',', '.'));

    if (a < b) {
      return order === 'asc' ? -1 : 1;
    } else if (a > b) {
      return order === 'asc' ? 1 : -1;
    } else {
      return 0;
    }
  });

  console.log('name,price,url');

  books.forEach(book => {
    book = book['@graph'][0];
    console.log(`"${book.name}","${book.offers.price}","${book['schema:url']}"`);
  });
}

function processFile(filePath) {
  const str = fs.readFileSync(filePath, 'utf-8');
  str.split('\n').forEach(url => {
    urls.push(url);
  });
}