
const secretkey = require('./secretkey').secretKey;
const jwt = require('jsonwebtoken');

//mongodb 연동 설정
const mongoclient =require('mongodb').MongoClient;
const ObjectId    =require('mongodb').ObjectId;
//아이디:암호@서버주소:포트번호/db명
const mongourl    ="mongodb://id311:pw311@1.234.5.158:37017/id311";



const auth = {
    //함수 : async function(req, res, next){}
    //함수 : async(req, res, next)=>{}
    checkToken : async (req, res, next ) =>{
        //req.body <=  post, put, delete
        //req.query <= get
        const token = req.headers.token;
        console.log('auth.js');
        console.log(req.body);

        if( !token){
            return res.send({ret:-1, data:'token이 없습니다.'});
        }

        try {
            //token decode 하기
            const user = jwt.verify( token, secretkey);

            if(typeof(user.idx) === 'undefined'){
                return res.send({ret:-1, data:'토큰 invalid'});
            }

            //id에서 정보를 읽어서 token과 비교해서 성공
            const dbconn     = await mongoclient.connect(mongourl);
            const collection = dbconn.db("id311").collection("member7");
    
            const query ={ _id : user.idx};
            const result = await collection.findOne(query, 
                {projection:{token :1}  });
            console.log(result);
            if(result.token.token !== token){
                return res.send({ret:-1, data:'토큰 invalid'});
            }

            
            //다음으로 넘길 때 전달 할 값을 req에 보관
            req.idx = user.idx;
            next();
        }
        catch(error){
            console.log(error);
            if(error.message === 'jwt expired'){
                return res.send({ret:-1, data:'토큰 expired'});
            }
            else if(error.message === 'invalid token'){
                return res.send({ret:-1, data:'토큰 invalid'});
            }
            else{
                return res.send({ret:-1, data:'토큰 invalid'});
            }
        }
    },
    testToken : async(req, res, next) => {
        next();
    }
}

module.exports =auth;  //다른 곳에서 사용 하기 위해서