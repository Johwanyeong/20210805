var express = require('express');
var router = express.Router();

//mongodb 연동 설정
const mongoclient =require('mongodb').MongoClient;
const ObjectId    =require('mongodb').ObjectId;
//아이디:암호@서버주소:포트번호/db명
const mongourl    ="mongodb://id311:pw311@1.234.5.158:37017/id311";


//파일첨부 설정
const multer      =require('multer');
const upload      =multer({storage : multer.memoryStorage()});


//글번호(자동증가를 위해서)
//mongodb에 counter7 컬렉션 만들기 입력 완료 후 ctrl + enter
//db.seq_item7.insert({
//    _id : 'SEQ_ITEM7_NO',
//    seq : 1
//});

//일괄수정[물품코드(변경x, 조건비교), 물품명, 물품내용, 가격, 수량]
//http://127.0.0.1:3000/api_seller/update
router.put('/update', upload.array("image") , async function(req, res, next) {
    try{
        //1.db 연결
        const dbconn     = await mongoclient.connect(mongourl);
        var collection = dbconn.db("id311").collection("item7");

        //2. 전달값 받기
        
        let cnt = 0;
        if(Array.isArray(req.body.code)) { //2개 이상일 경우
            for(let i=0; i<req.body.code.length; i++){
                const query = {_id : Number( req.body.code[i])};
                const changeData = {$set : {
                    name     : req.body.name[i],
                    text   : req.body.text[i],
                    price      : Number( req.body.price[i]),
                    quantity  : Number( req.body.quantity[i]),
                }};
                const result = await collection.updateOne(query, changeData);
                cnt = cnt + result.matchedCount;
            }
            if(cnt === req.body.code.length){
                return res.send({ ret:1, data:'일괄 수정 했습니다.'});
            }
            res.send({ret : 0, data:'일괄 수정 실패했습니다.'});
        }
        else { //1개인 경우
            const query={_id : Number( req.body.code)};
            const changeData = {$set : {
                name     : req.body.name,
                text   : req.body.text,
                price      : Number( req.body.price),
                quantity  : Number( req.body.quantity),
            }};
            const result  = await collection.updateOne (query, changeData);
            if(result.matchedCount === 1) {
                return res.send({ ret:1, data : '일괄 수정 했습니다.'});
            }
            res.send({ret : 0, data:'일괄 수정 실패했습니다.'});
        }
    }
    catch(error){
        console.error(error);
        res.send({ret:-1, data:error});
    }
});

//일괄삭제
//http://127.0.0.1:3000/api_seller/delete
router.delete('/delete', upload.array("image") , async function(req, res, next) {
    try{
        const dbconn     = await mongoclient.connect(mongourl);
        var collection = dbconn.db("id311").collection("item7");

        // 삭제할 code 값 받기
        const code = req.body.code;
        
        //1개일 경우의 조건
        let query = {_id : {$in : [ Number (code) ] } };
        //2개 이상
        if(Array.isArray(req.body.code)) { 
            const numArray = code.map(Number); //문자열배열-> 숫자배열
            query = { _id : { $in : numArray }};
        }

        const result = await collection.deleteMany(query);
        //console.log(result);
        if(result.deletedCount > 0){
            return res.send( {ret:1, data:'일괄 삭제 했습니다.'});
        }
        res.send({ret:0, data:' 일괄 삭제 실패했습니다.'});
    }
    catch(error){
        console.error(error);
        res.send({ret:-1, data:error});
    }
});


//일괄추가
//http://127.0.0.1:3000/api_seller/insert
router.post('/insert', upload.array("image") , async function(req, res, next) {
    try{
        //0. 물품코드 가져오기
        const dbconn     = await mongoclient.connect(mongourl);
        var collection = dbconn.db("id311").collection("seq_item7");

        var arr = [ ];
        if(Array.isArray(req.body.name)){ //2개 이상
            for(let i=0; i<req.body.name.length; i++ ) {
                const result = await collection.findOneAndUpdate(
                    {_id : 'SEQ_ITEM7_NO' },{$inc : {seq :1}});

                arr.push({
                    _id         : result.value.seq,
                    name     : req.body.name[i],
                    text       : req.body.text[i],
                    price      : Number( req.body.price[i]),
                    quantity  : Number( req.body.quantity[i]),
                    filename  : req.files[i].originalname,
                    filetype   : req.files[i].mimetype,
                    filedata   : req.files[i].buffer
                }); 
            }   
        }
        else{ //1개만
            const result = await collection.findOneAndUpdate(
                {_id : 'SEQ_ITEM7_NO' },{$inc : {seq :1}});

            arr.push({
                _id         : result.value.seq,
                name     : req.body.name,
                text       : req.body.text,
                price      : Number( req.body.price),
                quantity  : Number( req.body.quantity),
                filename  : req.files[0].originalname,
                filetype   : req.files[0].mimetype,
                filedata   : req.files[0].buffer
            })
        }
        // arr  => [{}]   [{}, {}, {}]
        // 3. insertMany(obj)
        collection = dbconn.db("id311").collection("item7");
        const result = await collection.insertMany(arr);
        console.log(result);

        if(result.insertedCount === req.body.name.length){
            return res.send({ret:1,
                data : `${req.body.name.length}개 추가 했습니다.`}
            );
        }
       res.send({ret:0, data:'추가 실패 했습니다.'})
        
    }
    catch(error){
        console.error(error);
        res.send({ret:-1, data:error});
    }
});

module.exports = router;
