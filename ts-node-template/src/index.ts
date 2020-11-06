/*-------------------基础类型----------------*/
let a:number = 1;
a = 2;
console.log(a);

/*-------------------函数泛型----------------*/
function getInfo<T, U>(name: T, age: U) {
    return name + ':' + age
}
getInfo<string, number>('Tom', 8)


/*-------------------类泛型----------------*/
interface Person {
    name: string,
    age: number
}

// T extends Person 表示泛型的约束
class Family<T extends Person, U>{
    members: T[]
    address: U
    phone: number
}

let f = new Family<Person, string>()
f.members = [
    { name: 'Tom', age: 12 },
    { name: 'Jerry', age: 20 },
]
f.address = 'China'
f.phone = 88876

