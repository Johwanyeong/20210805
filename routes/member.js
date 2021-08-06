var express = require('express');
var router = express.Router();

//회원 가입 시 hash
const crypto = require('crypto');
//const secretkey = '3214ew23rw~e'; //salt 값

//로그인 시 token 발행
const randToken = require('rand-token');
const jwt           = require('jsonwebtoken');
const secretKey   = require('../config/secretkey').secretKey;
const options   = require('../config/secretkey').options;

const checkToken = require('../config/auth').checkToken;

//mongodb 연동 설정
const mongoclient =require('mongodb').MongoClient;
const ObjectId    =require('mongodb').ObjectId;
//아이디:암호@서버주소:포트번호/db명
const mongourl    ="mongodb://id311:pw311@1.234.5.158:37017/id311";

//회원 정보 수정
//http://127.0.0.1:3000/member/update
router.put('/update', checkToken, async function(req,res, next){
    try{
        //0. 인증 통과 후 전달 된 값 받기
        //token을 decode 했을 때 정보가 있기 때문에
        const email = req.idx;
        const name = req.body.name;
        const phone = req.body.phone;

        //1. db연결
        const dbconn     = await mongoclient.connect(mongourl);
        const collection = dbconn.db("id311").collection("member7");

        //2.db저장
        const query ={_id : email};
        const changeData = {$set :{
            name : name,
            phone : phone}
        };
        console.log(query, changeData);
        
        //3.변경
        const result1 = await collection.updateOne(query, changeData);
        if( result1.matchedCount === 1){
            return res.send( { ret:1, data: '정보 수정 완료'});
        }
        res.send( {ret:0, data:'정보 수정 실패'});
    }
    catch(error){
        console.error(error); 
        res.send( {ret:-1, data: error} ); 
    }
});

//로그인 (이메일, 암호)
//http://127.0.0.1:3000/member/login
router.post('/login', async function(req,res, next){
    try{
        //1. 전달값 받기
        const email      = req.body.email;
        const password = req.body.password;
        console.log(email, password);
        //2. 화원 가입방식과 암호는 hash 후 비교
        const hash = crypto.createHmac('sha256', email)
            .update(password).digest('hex');

        console.log(hash);
        //3. db 연결
        const dbconn     = await mongoclient.connect(mongourl);
        const collection = dbconn.db("id311").collection("member7");

        //4. db에서 조회
        const query = { _id: email, password: hash };
        const result = await collection.findOne(query);
        console.log(result);

        //5. result 결과에 따라서 token 생성
        if(typeof(result) !== 'undefined'){
            const payload = { //token에 저장되는 내용
                idx    : result._id,
                name : result.name
            };
           
            const resultToken = {
                token : jwt.sign( payload, secretKey, options),
                refreshToken : randToken.uid(256)
            }

            //db에 생성한 token을 update
            const query1 = { _id: email };
            const changeData = { $set: {token : resultToken} };

            const result1= await collection.updateOne(query1, changeData);
            if(result1.modifiedCount ===1){
                res.send({ret:1, jwtToken : resultToken} );  
            }
            else{
                res.send({ret:0, data:'token 발행 실패'}); 
            }
        }
        else{
            res.send( { ret:0 , data:'token 발행 실패'})
        }
    }
    catch(error){
        console.error(error); 
        res.send( {ret:-1, data: error} ); 
    }
});


//회원가입(이메일, 암호, 이름, 연락처, 등록일자(x))
//127.0.0.1:3000/member/join
//유효성 검사 완료 후 전송되는 것으로 가정
router.post('/join', async function(req,res, next){
    try{
        //1. 전달 되는 값 받기(body.name 값 일치)

        //salt 값으로 이메일 사용
        const hash = crypto.createHmac('sha256', req.body.email)
                        .update(req.body.password).digest('hex');
        const obj = {
            _id      : req.body.email,
            password : hash,
            name     : req.body.name,
            phone    : req.body.phone,
            regdate  : new Date()
        }
        console.log(obj); //debug용

        //2.db 연결
        const dbconn     = await mongoclient.connect(mongourl);
        const collection = dbconn.db("id311").collection("member7");

        //3.db에 추가하기
        const result = await collection.insertOne(obj);
        console.log(result);

        //4.db닫기
        dbconn.close();

        //5.결과 리턴
        if(result.insertedId === obj._id){
            res.send({ret:1, data:'회원가입 성공'});
        }
        else{
            res.send({ret:0, data:'회원가입 실패'});
        }

    }
    catch(error){
        console.error(error); 
        res.send( {ret:-1, data: error} ); 
    }
});

//이메일 중복 확인(이메일)
//127.0.0.1:3000/member/emailcheck?email=a@a.com
router.get('/emailcheck',async function(req, res, next){
    try{
          //1. 전달값 받기
          const email      = req.query.email;

          //2.db 연결
        const dbconn     = await mongoclient.connect(mongourl);
        const collection = dbconn.db("id311").collection("member7");

        //3. db에서 조회
        const query = { _id: email};
        const result = await collection.countDocuments(query);
        console.log(result)

        //4. 결과 리턴
        res.send({ret:1, data:result});

    }
    catch(error){
        console.error(error); 
        res.send( {ret:-1, data: error} ); 
    }
});

//비밀번호 변경(변경할 암호)
//[put]127.0.0.1:3000/member/changepw
router.put('/changepw', checkToken, async function(req,res, next){
    try{
        //0. 전달 값 받기
        //checkToken에서 성공 req.idx <=이메일
        const email = req.idx;
        const newpassword = req.body.newpassword;

        //1.db연결
        const dbconn     = await mongoclient.connect(mongourl);
        const collection = dbconn.db("id311").collection("member7");

        //2. newpassword hash 하기 => a -> afasdfasdfefq232r
        const hash = crypto.createHmac('sha256', email)
            .update(newpassword).digest('hex');

        //3.db에 수정
        const query ={_id : email};
        const changeData = {$set :{ password : hash}};
        const result = await collection.updateOne(query, changeData);
        console.log(result);

        //4.db닫기
        dbconn.close();

        //5.결과 반환
        if( result.matchedCount === 1){
            return res.send( { ret:1, data: '암호 수정 완료'});
        }
        res.send( {ret:0, data:'암호 수정 실패'})
    }
    catch(error){
        console.error(error); 
        res.send( {ret:-1, data: error} ); 
    }
});

//로그아웃
//[post]127.0.0.1:3000/member/logout
router.post('/logout', checkToken, async function(req,res, next){
    try{
        //1. 인증 후 전달되는 값 받기
        const email= req.idx;

        //2. db연결
        const dbconn     = await mongoclient.connect(mongourl);
        const collection = dbconn.db("id311").collection("member7");

        //3.db update를 통해 token 값 지우기
        const query ={_id : email};
        const changeData = {$set :{ token : ''}};
        const result = await collection.updateOne(query, changeData);
        console.log(result);

        //4.db 닫기
        dbconn.close();
        //5.결과값 반환
        if( result.matchedCount === 1){
            return res.send( { ret:1, data: '로그아웃 성공'});
        }
        res.send( {ret:0, data:'로그아웃 실패'});
    }
    catch(error){
        console.error(error); 
        res.send( {ret:-1, data: error} ); 
    }
});

//회원탈퇴
//[delete]127.0.0.1:3000/member/delete
router.delete('/delete', checkToken, async function(req,res, next){
    try{
        //1. 인증 후 전달되는 값 받기
        const email= req.idx;
        //2. db연결
        const dbconn     = await mongoclient.connect(mongourl);
        const collection = dbconn.db("id311").collection("member7");
        //3.db update를 통해 token 값 지우기
        const query ={_id : email};
        const result = await collection.deleteOne(query);
        console.log(result); //{   }
        //4.db 닫기
        dbconn.close();
        //5.결과값 반환
        if( result.deletedCount === 1){
            return res.send( { ret:1, data: '회원탈퇴 성공'});
        }
        res.send( {ret:0, data:'회원탈퇴 실패'});
    }
    catch(error){
        console.error(error); 
        res.send( {ret:-1, data: error} ); 
    }
});


module.exports = router;
