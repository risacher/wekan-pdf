const inch=25.4;
const pwidth = 11*inch;
const pheight = 8.5*inch;
const margin = 1*inch; 
const spwidth = 8.5*inch;
const spheight = 4.5*inch; 

var headers = {
    "Content-Type": "application/json",
};

function fetchBoards(id, token) {
  headers.Authorization = "bearer "+token;
  fetch("/wekan/api/users/"+id+"/boards", {
    method: 'GET',
    headers: headers
  })
    .then((response) => { return response.json(); })
    .then((rBoards) => {
      document.rBoards = rBoards;
      //document.getElementById('log').innerHTML += '<br/>'+JSON.stringify(rBoards);
      document.getElementById('board-select').innerHTML = 
        rBoards.map((e,i,a) => { return "<option value=\""+e._id+"\">"+e.title+"</option>"}).join("");
    })
}

var token = sessionStorage.getItem("wekantoken");
var id = sessionStorage.getItem("wekanid");
// attempt to connect with stored wekantoken & wekanid
// if it doesn't work, then user will have to provide username and password.
fetchBoards(id, token);

document.getElementById("fLogin").onsubmit = () => {
  var uName = document.getElementById("username").value;
  var pWord = document.getElementById("password").value;

  delete headers.Authorization;
  fetch("/wekan/users/login", {
    method: 'POST',
    headers: headers, 
    body: JSON.stringify({username: uName, password: pWord })
  }).then((response) => { return response.json(); })
    .then((rLogin) => {
      console.log(rLogin);
      token=rLogin.token;
      sessionStorage.setItem("wekantoken",token);
      headers.Authorization = "bearer "+rLogin.token;
      id=rLogin.id;
      sessionStorage.setItem("wekanid",id);
      console.log(JSON.stringify(rLogin));
      // document.getElementById('log').innerHTML = JSON.stringify(rLogin);
      return rLogin;
    }).then((rLogin) => {
      fetchBoards(rLogin.id, rLogin.token);
    })
  return false;
};

document.getElementById('board-select').onchange = (e) => {
  console.log(JSON.stringify(e));
  var bId = e.target.options[e.target.selectedIndex].value;
  fetch("/wekan/api/boards/"+bId+"/export", {        
    method: 'GET',
    headers: headers
  })
    .then((response) => { return response.json(); })
    .then((rBoard) => {
      //              document.getElementById('log').innerText += '<br/>'+JSON.stringify(rBoard);
      document.rBoard = rBoard;
      genPDF(rBoard);
    })
  return false;
};

function genPDF(b) {
  var doc = new jsPDF( { orientation: 'landscape',
                         format: [spheight, spwidth] } );
  document.pdf = doc;
  var target = document.getElementById('target');
  var live_lists = b.lists
      .filter((e)=> { return !e.archived})
      .sort((a,b)=>{return a.sort-b.sort});

  var colors =
      [...new Set(b.lists.map((e)=>{return e.color}))]
      .filter((e)=>{return e});

  if (colors.length === 0) {
    doc.text("No lists in the selected board have a color", 20, 20);
  };
  
  colors.forEach((color, ic, ac) => {
    var lists = live_lists.filter((e) => { return e.color === color;})
    var lists_by_id = lists.map((e) => { return e._id });
    var rows = [];
    lists_by_id.forEach((e1,i1,a1) => { // e1 is the listId
      b.cards // e2 is everycard card
        .filter((e2)=>{return !e2.archived && e2.listId === e1})
        .sort((a,b) => { return a.sort - b.sort} )
        .map((e3)=>{return e3.title})  // e3 is card, sorted and filtered 
        .forEach((e4,i4,a4) => { //e4 is the title of the sorted, filtered card
          if (!rows[i4]) { rows[i4] = lists_by_id.map((e5)=>{return "";}) }
          rows[i4][i1] = e4;
        });
    });
    
    //  console.log(rows);
    var numCols = lists.length; 
    doc.autoTable({
//      startY: 5,
      //      margin:5,
//      margin: {top: 5,
//               right: (0)?pwidth/2+margin:5,
//               bottom: 5,
      //               left:  (0)?5:pwidth/2+margin },
      margin: { top: 5,
                right: 5,
                bottom: 5,
                left: 5 },
//      tableWidth: pwidth-10,
//      tableWidth: pwidth/2-margin-5,
//      margin: (ic%2)?5:pwidth/2+margin,
      head: [lists.map((e)=>{return e.title;})],
      headStyles: {fillColor: color}, // Red
      columnStyles: { 0: {cellWidth: (pwidth/2-margin-5)/numCols},
                      1: {cellWidth: (pwidth/2-margin-5)/numCols},
                      2: {cellWidth: (pwidth/2-margin-5)/numCols},
                      3: {cellWidth: (pwidth/2-margin-5)/numCols} },
      didDrawPage: function (data) {
        // Header
        doc.setFontSize(10);
        doc.setTextColor(40);
        doc.setFontStyle('normal');
        doc.text(b.title + " - "
                 + dateToISOLikeButLocal(new Date())
                 + " - Page " + doc.internal.getNumberOfPages(),
                 data.settings.margin.left, 4);
      },
      body: rows
    });
    
//    doc.setFontSize(8);
//    doc.text(new Date().toISOString(), 10, pheight-.25*inch);
  } );

  var npage = doc.internal.getNumberOfPages();
  var frontPnum, backPnum;
  for (i = 1; i<= npage; i++){
    if (i%4 === 1) {
      doc.addPage('letter', 'landscape');
      centerLine(doc);
      frontPnum = doc.internal.getNumberOfPages();
      doc.addPage('letter', 'landscape');
      centerLine(doc);
      backPnum = doc.internal.getNumberOfPages();
      doc.setPage(frontPnum);
      doc.embedPage(i, { angle:  90, yoffset: pheight, xoffset: pwidth/2+margin} );
    } else if (i%4 === 2) { 
      doc.setPage(backPnum);
      doc.embedPage(i, { angle: -90, yoffset: 0, xoffset: pwidth } );
    } else if (i%4 === 3) { 
      doc.setPage(frontPnum);
      doc.embedPage(i, { angle:  -90, yoffset: 0, xoffset: pwidth/2-margin } );
    } else if (i%4 === 0) { 
      doc.setPage(backPnum);
      doc.embedPage(i, { angle: 90, yoffset: pheight, xoffset: 0 } );
    }
  }

  for (i = npage; i> 0; i--){
    doc.deletePage(i);
  }
  target.data = doc.output('datauristring');
}


function centerLine(doc) {
  doc.line(pwidth/2,0,pwidth/2,pheight);
}

function dateToISOLikeButLocal(date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  const msLocal =  date.getTime() - offsetMs;
  const dateLocal = new Date(msLocal);
  const iso = dateLocal.toISOString();
  const isoLocal = iso.slice(0, 16);
  return isoLocal;
}

