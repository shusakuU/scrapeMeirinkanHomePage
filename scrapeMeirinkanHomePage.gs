function scrapeOneMathPageIncludingLink(pageNumber) {
  let meirinkanMathCategoryUrl = makeMathCategoryUrlFromNumber(pageNumber);
  let html = UrlFetchApp.fetch(meirinkanMathCategoryUrl).getContentText();
  let parsedHtml = Parser.data(html);
  
  let divTags = parsedHtml.from('<div id="result_list_box').to("</a>").iterate();
  // Logger.log(divTags.length);
  let valuesArray = []
  for(let i=0; i<divTags.length; i++){
    let div = Parser.data(divTags[i]);
    let link = div.from('href="').to('"').build();
    let dlTag = div.from('<dl').to("</dl>").build();
    let infoArray = dlTagToInfoArray(dlTag).concat([link]);
    valuesArray.push(infoArray);
    // Logger.log(infoArray);
  }
  // Logger.log(valuesArray);
  return valuesArray
  
}


function checkNewArrivals(){
  const mathBooksInfoArray = scrapeOneMathPageIncludingLink(1);
  const newestFiftyBooks = getNameArrayFromSheet(50);
  
  var newArrivalNo;
  for(let i = 0; i<mathBooksInfoArray.length; i++){
    let isFound = false;
    for(let j=0; j<newestFiftyBooks.length; j++){
      if(mathBooksInfoArray[i][0]==newestFiftyBooks[j][0]){
        isFound = true;
        break;
      }
    }
    if(isFound){
      newArrivalNo = i;
      break
    }
  }
  
  var newArrivalBooks = mathBooksInfoArray.slice(0,newArrivalNo);
  
  Logger.log(newArrivalBooks, newArrivalNo)
  if(newArrivalBooks.length>0){
    appendNewArrayToTopOfSheet(newArrivalBooks);
    
    Logger.log(newArrivalBooks.length);
    Logger.log(newArrivalBooks);
    
    let textToSendToSlack = "";
    for(let i=0; i < newArrivalBooks.length; i++){
      let bookInfo = newArrivalBooks[i];
      textToSendToSlack = textToSendToSlack.concat('*',bookInfo[0],'*\n', bookInfo[1]?bookInfo[1]+'\n':'',
                                                   bookInfo[2]?bookInfo[2]+'\n':'', bookInfo[2]?bookInfo[2]+'\n':'',
                                                   bookInfo[3]?bookInfo[3]+'\n':'', bookInfo[7]?bookInfo[7]+'円\n':'',
                                                   bookInfo[8],'\n\n');
    }
    if(textToSendToSlack!=""){
      let scriptProperties = PropertiesService.getScriptProperties();
      let mentionId = scriptProperties.getProperty("slackMentionId");
      sendToSlack("<@"+ mentionId +">\n今日の明倫館新刊情報 "+makeMathCategoryUrlFromNumber(1));
      sendToSlack(textToSendToSlack);
    }
  }
}


function appendNewArrayToTopOfSheet(newValues){
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("spreadsheetId");
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName('数学書');
  
  const lastRow = sheet.getLastRow();
  let existedValues = sheet.getRange(2, 2, lastRow-1, 9).getValues();
  sheet.getRange(newValues.length+2, 2, existedValues.length, 9).setValues(existedValues);
  sheet.getRange(2, 2, newValues.length, 9).setValues(newValues);
}




function getNameArrayFromSheet(num){
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("spreadsheetId");
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName('数学書');
  let rangeToRead = sheet.getRange(2, 2, num, 1);
  return rangeToRead.getValues();
}


function scrapeAllMathPage(){
  for(let i=70; i<81; i++){
    let valuesArray = scrapeOneMathPageIncludingLink(i);
    writeValuesArrayToSpreadSheet(valuesArray);
    Utilities.sleep(10000);
  }
}

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




function makeMathCategoryUrlFromNumber(pageNum){
  const meirinkanMathCategoryUrl = "https://www.meirinkanshoten.com/products/list?mode=&category_id=20000&name=&pageno={pageNumber}&disp_number=50&orderby=2".replace("{pageNumber}",pageNum);
  return meirinkanMathCategoryUrl;
}



function writeValuesArrayToSpreadSheet(valuesArray){
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("spreadsheetId");
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName('数学書');
  const lastRow = sheet.getLastRow();
  let rangeToWrite = sheet.getRange(lastRow+1, 2, valuesArray.length, 9);
  rangeToWrite.setValues(valuesArray);
}


function sendToSlack(text){
  const scriptProperties = PropertiesService.getScriptProperties();
  const postUrl = scriptProperties.getProperty("slackURL");
  const username = 'Apps Script'; 
  const icon = ':apps_script:'; 
  const message = text; 
  
  const jsonData =
  {
     "username" : username,
     "icon_emoji": icon,
     "text" : message
  };
  const payload = JSON.stringify(jsonData);
  
  const options =
  {
    "method" : "post",
    "contentType" : "application/json",
    "payload" : payload
  };
  
  UrlFetchApp.fetch(postUrl, options);
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
