function scrapeAndWriteOneMathPage(pageNumber) {
  let meirinkanMathCategoryUrl = makeMathCategoryUrlFromNumber(pageNumber);
  let html = UrlFetchApp.fetch(meirinkanMathCategoryUrl).getContentText();
  let parsedHtml = Parser.data(html);
  
  let dlTags = parsedHtml.from('<dl').to("</dl>").iterate();
  Logger.log(dlTags.length);
  let valuesArray = []
  for(let i=0; i<dlTags.length; i++){
    let infoArray = dlTagToInfoArray(dlTags[i]);
    valuesArray.push(infoArray);
    Logger.log(infoArray);
  }
  Logger.log(valuesArray);
  writeValuesArrayToSpreadSheet(valuesArray);
}


function scrapeAllMathPage(){
  for(let i=70; i<81; i++){
    // scrapeAndWriteOneMathPageInclud(i);
    scrapeAndWriteOneMathPageIncludingLink(i);
    Utilities.sleep(10000);
    }
  }
     
var example = 'id="result_list__detail--613742"> \
                 <dt id="result_list__name--613742" class="item_price_0">コミュニケーションの数学的理論</dt> \
                 <dd id="result_list__sub_title1--613742" class="item_price_0"><span style="font-size:1.2rem">情報理論の基礎</span></dd>\
                 <dd id="result_list__sub_title2--613742" class="item_price_0"><span style="font-size:1.2rem"></span></dd>\
                 <dd id="result_list__author--613742" class="item_name_0">C.E.シャノン/W.ウィーヴァー　長谷川淳・井上光洋訳</dd> \
                 <dd id="result_list__series--613742" class="item_name_0">海外名著選5</dd> \
                 <dd id="result_list__publisher--613742" class="item_name_0">明治図書出版</dd> \
                 <dd id="result_list__product_condition--613742" class="item_comment_0">ヤケ・シミ・ヨゴレ・擦れ有。函やや傷み有。本文は概ね良好。</dd> \
                 <dd id="result_list__price02_inc_tax--613742" class="item_price_0 text-primary">¥ 3,300</dd>'

function dlTagToInfoArray(dlTag){
  let parsedDlTag = Parser.data(dlTag);
  let title = parsedDlTag.from("<dt").to("</dt>").build().split('>')[1];
  //Logger.log(title);
  
  const aspectsArray = ["sub_title1", "sub_title2", "author", "series", "publisher", "product_condition", "price02_inc_tax"];
  let values = [null, null, null, null, null, null, null];
  let ddTags = parsedDlTag.from("<dd").to("</dd>").iterate()
  for(let i = 0; i < ddTags.length; i++){
    let dd = ddTags[i];
    for(let j=0; j<aspectsArray.length; j++){
      if(dd.includes(aspectsArray[j])){ 
        if(dd.includes('</span>')){   // "sub_title1", "sub_title2"の場合
          if(dd.charAt(dd.indexOf('</span>')-1)!=">"){
            values[j] = Parser.data(dd).from('rem">').to('</span>').build();
          }
        }
        if(dd.charAt(dd.length-1)!=">"){
          let value =  dd.split('>')[1];
          if(j==6){
            value = value.replace('¥','').replace(',','').trim();
          }
          values[j] = value;
        }
      break;
      }
    }
  }
  
  values = [title].concat(values);
  return values
}



function scrapeAndWriteOneMathPageIncludingLink(pageNumber) {
  let meirinkanMathCategoryUrl = makeMathCategoryUrlFromNumber(pageNumber);
  let html = UrlFetchApp.fetch(meirinkanMathCategoryUrl).getContentText();
  let parsedHtml = Parser.data(html);
  
  let divTags = parsedHtml.from('<div id="result_list_box').to("</a>").iterate();
  Logger.log(divTags.length);
  let valuesArray = []
  for(let i=0; i<divTags.length; i++){
    let div = Parser.data(divTags[i]);
    let link = div.from('href="').to('"').build();
    let dlTag = div.from('<dl').to("</dl>").build();
    let infoArray = dlTagToInfoArray(dlTag).concat([link]);
    valuesArray.push(infoArray);
    Logger.log(infoArray);
  }
  Logger.log(valuesArray);
  writeValuesArrayToSpreadSheet(valuesArray);
}



function makeMathCategoryUrlFromNumber(pageNum){
  const meirinkanMathCategoryUrl = "https://www.meirinkanshoten.com/products/list?mode=&category_id=20000&name=&pageno={pageNumber}&disp_number=50&orderby=2".replace("{pageNumber}",pageNum);
  return meirinkanMathCategoryUrl;
}



function writeValuesArrayToSpreadSheet(valuesArray){
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("spreadsheetId");
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName('数学書');
  const lastRow = sheet.getLastRow();
  let rangeToWrite = sheet.getRange(lastRow+1, 1, valuesArray.length, 9);
  rangeToWrite.setValues(valuesArray);
}