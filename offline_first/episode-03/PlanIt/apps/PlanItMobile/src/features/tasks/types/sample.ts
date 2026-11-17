


function createCounter () {
    let count = 0 ; 
    return function counter(){
        count++;
        return count;
    } 
}
const counter = createCounter();
console.log(counter());


const promise = new Promise((resolve,reject)=>{
    setTimeout(()=>{
        resolve("data received");
    },1000);
})

promise.then((result)=>{
    console.log(result);
})