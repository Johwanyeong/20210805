//cmd> npm i mymodule --save

module.exports ={
    secretKey : 'fgd2qtagwe23sge',
    options   : {
        algorithm : "HS256", //hash 알고리즘
        expiresIn  : "10h",    //발행된 토큰의 유효시간(10시간)
        issuer      : "corp01"  //발행자
    }
}