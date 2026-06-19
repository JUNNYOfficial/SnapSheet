# SnapLang 编程语言设计规范

> 版本：1.0.0-draft  
> 状态：设计中  
> 日期：2025-06-19

---

## 目录

1. [语言概述](#1-语言概述)
2. [设计原则](#2-设计原则)
3. [词法规范](#3-词法规范)
4. [语法规则](#4-语法规则)
5. [类型系统](#5-类型系统)
6. [语义规范](#6-语义规范)
7. [内置函数与标准库](#7-内置函数与标准库)
8. [编译器架构](#8-编译器架构)
9. [运行时引擎](#9-运行时引擎)
10. [API 与扩展机制](#10-api-与扩展机制)
11. [办公软件集成](#11-办公软件集成)
12. [路线图](#12-路线图)

---

## 1. 语言概述

### 1.1 语言定位

**SnapLang** 是一款专为办公软件场景设计的通用脚本语言，旨在为 Snap 办公套件（SnapSheet 电子表格、SnapDoc 文档处理、SnapSlide 演示文稿）提供统一的核心引擎。

### 1.2 核心特性

| 特性 | 描述 |
|------|------|
| **简洁易学** | 类似 TypeScript/JavaScript 的语法，降低学习成本 |
| **类型安全** | 强类型系统，支持静态类型检查与类型推断 |
| **表达式优先** | 以表达式为核心，支持函数式编程范式 |
| **办公集成** | 原生支持表格、文档、演示等办公数据结构 |
| **跨平台** | 支持 Web、桌面、移动端多端运行 |
| **可扩展** | 提供 FFI 机制，支持调用外部库和系统 API |

### 1.3 设计目标

1. **简化办公自动化** - 让用户能轻松编写脚本处理重复性任务
2. **统一脚本生态** - 为 Snap 办公套件提供统一的扩展机制
3. **性能优先** - 编译为高效字节码，支持 JIT 优化
4. **渐进式学习** - 支持脚本模式与完整工程模式

### 1.4 应用场景

```
┌─────────────────────────────────────────────────────────────┐
│                      SnapLang 应用场景                        │
├─────────────────────────────────────────────────────────────┤
│  📊 SnapSheet    │ 公式计算、数据分析、批量数据处理、宏脚本    │
│  📄 SnapDoc      │ 文档模板、数据填充、内容自动化生成          │
│  📽️ SnapSlide    │ 演示自动化、数据驱动幻灯片生成              │
│  🔧 办公自动化   │ 跨应用工作流、批量处理、系统集成            │
│  🌐 Web/桌面应用 │ 轻量级业务逻辑、脚本插件、数据处理脚本       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 设计原则

### 2.1 核心哲学

```
SnapLang = Simple + Powerful + Purposeful
```

### 2.2 设计准则

#### 2.2.1 简洁性原则
- **最小惊讶原则** - 语言行为应符合开发者直觉
- **单一且明确的语法** - 避免歧义，减少例外情况
- **必要的复杂性** - 不为追求简洁而牺牲表达能力

#### 2.2.2 可读性原则
- **清晰的语法结构** - 使用缩进、空格增强可读性
- **有意义的命名** - 变量、函数命名应具有描述性
- **一致的编码风格** - 提供官方格式化工具

#### 2.2.3 实用性原则
- **渐进式类型系统** - 可选类型注解，适应不同场景
- **丰富的标准库** - 内置常用功能，减少外部依赖
- **友好的错误信息** - 帮助开发者快速定位和修复问题

### 2.3 语法设计哲学

```
传统语言:     if (condition) { doSomething(); }
SnapLang:     if condition then doSomething()
              else if otherCondition then doOther()
              else doDefault()

传统语言:     function add(a, b) { return a + b; }
SnapLang:     fn add(a: Number, b: Number) -> Number = a + b

传统语言:     arr.filter(x => x > 0).map(x => x * 2)
SnapLang:     arr.filter(> 0).map(* 2)
```

---

## 3. 词法规范

### 3.1 词法单元

#### 3.1.1 关键字

```
控制流:       if else when for while loop break continue return match
函数:         fn func return
类型:         let const var type enum struct interface trait impl
模块:         import export from as
异常:         try catch throw finally raise
并发:         async await spawn sync mutex channel
其他:         pub priv static mut self super true false nil yield
```

#### 3.1.2 标识符

```
标识符规则:   [a-zA-Z_][a-zA-Z0-9_]*
命名约定:     
  - 变量/函数: 小写下划线 (snake_case)
  - 类型/结构: 首字母大写 (PascalCase)
  - 常量:      全大写下划线 (SCREAMING_SNAKE_CASE)
  - 私有成员:  以下划线开头 (_private)

示例:
  let user_name = "Alice"
  let MaxRetries = 3
  struct UserProfile { ... }
```

#### 3.1.3 字面量

```snaplang
// 整数
42          // 十进制
0xFF        // 十六进制
0b1010      // 二进制
0o755       // 八进制

// 浮点数
3.14
6.02e23
1.0e-10

// 字符串
"Hello, World!"
'Single quotes also work'
`Multi-line
string`

// 原始字符串 (转义不转义)
r"path\to\file"
r#"<div class="example">content</div>"#

// 插值字符串
let name = "Alice"
"Hello, {name}!"  // => "Hello, Alice!"
```

#### 3.1.4 运算符

```
算术:        +  -  *  /  %  **  //
比较:        ==  !=  <  >  <=  >=  <=>  ===  !==
逻辑:        and or not
位运算:       &  |  ^  ~  <<  >>  >>>
赋值:        =  +=  -=  *=  /=  %=  **=  //=  &=  |=  ^=
特殊:        ??  ?.  ...  ..  @  #  $
```

#### 3.1.5 分隔符

```snaplang
()     // 函数调用、表达式分组
[]     // 数组索引、数组字面量
{}     // 代码块、对象字面量
,      // 参数分隔
:      // 类型注解、对象键值对
;      // 语句结束
->     // 函数返回类型、lambda
=>     // match分支、箭头函数
|      // 联合类型、match分支
?      // 可选类型、可选链
!      // 非空断言、宏展开
```

### 3.2 注释规则

```snaplang
// 单行注释

/*
   多行
   注释
*/

/// 文档注释 (用于函数、类型前)
/// 
/// # Examples
/// 
/// fn add(a, b) = a + b

//! 内部文档注释 (表示不导出)
```

### 3.3 空白与缩进

- 使用 **空格** 或 **Tab** 进行缩进（统一使用 2 或 4 空格）
- 缩进级别表示代码块的嵌套关系
- 换行符表示语句结束（分号可选）
- 允许使用反斜杠 `\` 进行续行

```snaplang
let result = someLongFunction(
    arg1,
    arg2,
    arg3
)

let formula = "=SUM(" + \
    "A1:A10" + \
    ")"
```

---

## 4. 语法规则

### 4.1 程序结构

```snaplang
// 文件扩展名: .snap

// 模块声明 (可选)
module com.example.app

// 导入语句
import std.io
import std.math as math
from "./utils" import helper, Constants
from "./types" import *

// 常量声明
const PI = 3.14159
const VERSION = "1.0.0"

// 类型声明
type Matrix = List[List[Number]]

// 函数声明
fn calculate(x: Number) -> Number {
    return x * 2 + 1
}

// 主入口 (可选)
fn main() {
    print("Hello, SnapLang!")
}
```

### 4.2 变量声明

```snaplang
// 不可变变量 (推荐)
let name = "Alice"
let age: Number = 30
let scores = [95, 87, 92]

// 可变变量
var counter = 0
counter += 1

// 常量
const MAX_SIZE = 100

// 解构赋值
let (x, y) = (10, 20)
let [first, ...rest] = [1, 2, 3, 4, 5]
let { name: userName, age: userAge } = user

// 类型注解
let data: Map[String, Any] = {}
let matrix: Matrix = [[1, 2], [3, 4]]
```

### 4.3 函数定义

```snaplang
// 基本函数
fn greet(name) {
    print("Hello, {name}!")
}

// 带类型注解
fn add(a: Number, b: Number) -> Number {
    return a + b
}

// 表达式函数 (单行)
fn mul(a, b) = a * b

// 默认参数
fn connect(url: String, timeout: Number = 30) {
    // ...
}

// 可变参数
fn sum(...nums: Number[]) -> Number {
    return nums.reduce(0, +)
}

// 命名参数
fn configure(width: Number, height: Number, color: String) {
    // ...
}
configure(width: 800, height: 600, color: "blue")

// Lambda 表达式
let double = |x| x * 2
let add = |a, b| a + b
let filter = |x| if x > 0 then x else nil

// 闭包
fn makeCounter() {
    var count = 0
    return || {
        count += 1
        return count
    }
}
```

### 4.4 控制流

#### 4.4.1 条件语句

```snaplang
// if-else
if score >= 60 {
    print("Pass")
} else {
    print("Fail")
}

// else if
if grade >= 90 {
    print("A")
} else if grade >= 80 {
    print("B")
} else if grade >= 70 {
    print("C")
} else {
    print("D")
}

// 表达式形式
let level = if score >= 90 then "A"
              else if score >= 80 then "B"
              else if score >= 70 then "C"
              else "D"

// unless 条件 (条件为 false 时执行)
unless isLoggedIn {
    redirect("/login")
}

// 条件表达式
let message = if isValid then "OK" else "Error"
```

#### 4.4.2 循环语句

```snaplang
// for 循环 (遍历)
for item in items {
    print(item)
}

// 带索引
for i, item in items {
    print("{i}: {item}")
}

// for range
for i in 0..10 {
    print(i)  // 0, 1, 2, ..., 9
}

for i in 0..=10 {
    print(i)  // 0, 1, 2, ..., 10
}

// while 循环
var i = 0
while i < 10 {
    print(i)
    i += 1
}

// loop 无限循环
loop {
    let input = readLine()
    if input == "quit" then break
    process(input)
}

// 循环控制
for item in items {
    if item < 0 then continue
    sum += item
}
```

#### 4.4.3 Match 表达式

```snaplang
// 基本 match
match value {
    1 => "one"
    2 => "two"
    3 => "three"
    _ => "other"
}

// 带条件
match score {
    n if n >= 90 => "A"
    n if n >= 80 => "B"
    n if n >= 70 => "C"
    _ => "D"
}

// match 表达式
let result = match opt {
    Some(v) => v * 2
    None => 0
}

// 匹配多个值
match command {
    "start" | "run" => startProcess()
    "stop" | "kill" => stopProcess()
    _ => unknownCommand()
}

// 匹配结构
match point {
    (0, 0) => "origin"
    (x, 0) => "on x-axis: {x}"
    (0, y) => "on y-axis: {y}"
    (x, y) => "({x}, {y})"
}
```

### 4.5 错误处理

```snaplang
// try-catch
try {
    let data = readFile("data.json")
    process(data)
} catch error {
    print("Error: {error.message}")
}

// 捕获特定错误类型
try {
    riskyOperation()
} catch ValidationError as e {
    print("Validation failed: {e.message}")
} catch NetworkError as e {
    print("Network error: {e.code}")
} catch {
    print("Unknown error")
}

// finally
try {
    let file = open("data.txt")
    defer file.close()  // 确保关闭
    // 处理文件
} catch {
    // 处理错误
}

// ? 操作符 (错误传播)
fn readConfig() throws ConfigError {
    let content = readFile("config.json")?
    let config = parseJSON(content)?
    return config
}

// try? 表达式
let result = try? mightFail() else defaultValue
```

### 4.6 类型系统语法

```snaplang
// 类型别名
type IntList = List[Int]
type Point2D = (Number, Number)
type StringMap = Map[String, Any]

// 枚举
enum Color {
    Red
    Green
    Blue
    RGB(r: Number, g: Number, b: Number)
}

let myColor = Color.RGB(r: 255, g: 128, b: 0)

// 结构体
struct User {
    name: String
    email: String
    age: Number
    active: Bool = true  // 默认值
}

let user = User(name: "Alice", email: "alice@example.com", age: 30)

// 可选类型
let name: String? = "Alice"
let empty: String? = nil

// 类型联合
type Result = Success | Error
type Numeric = Int | Float

// 接口
interface Drawable {
    fn draw(ctx: Context)
    fn getBounds() -> Rect
}

interface Serializable {
    fn toJSON() -> String
}

// 实现
impl Drawable for Circle {
    fn draw(ctx) {
        ctx.drawCircle(self.center, self.radius)
    }
    fn getBounds() = self.bounds
}

// 泛型
struct Stack[T] {
    var items: List[T] = []
    
    fn push(item: T) {
        self.items.append(item)
    }
    
    fn pop() -> T? {
        return self.items.pop()
    }
}
```

### 4.7 模块系统

```snaplang
// 导入标准库
import std.io
import std.math
import std.collections

// 导入并重命名
import std.io as io
import std.regex as re

// 选择性导入
from std.io import print, readLine
from std.collections import List, Map

// 导入所有
from std.utils import *

// 相对导入
from "./utils" import helper
from "../shared" import constants

// 模块导出
module mylib

export fn publicFunction() { ... }
export type PublicType

// 条件导入
import std.platform.current
```

---

## 5. 类型系统

### 5.1 内置类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `Int` | 有符号整数 | `42`, `0xFF` |
| `Float` | 64位浮点数 | `3.14`, `1e10` |
| `Bool` | 布尔值 | `true`, `false` |
| `Char` | Unicode字符 | `'A'`, `'中'` |
| `String` | 字符串 | `"Hello"` |
| `Nil` | 空值 | `nil` |
| `Any` | 动态类型 | 任意值 |
| `Never` | 无返回值 | 永不返回 |

### 5.2 集合类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `List[T]` | 可变数组 | `[1, 2, 3]` |
| `Tuple[T, U]` | 固定长度 | `(1, "a")` |
| `Set[T]` | 无序集合 | `{1, 2, 3}` |
| `Map[K, V]` | 键值对 | `{"a": 1}` |
| `Range` | 范围 | `0..10` |

### 5.3 类型层级

```
Any
├── Nil
├── Bool
├── Number
│   ├── Int
│   └── Float
├── String
│   └── Char
├── Collection
│   ├── List[T]
│   ├── Set[T]
│   ├── Map[K, V]
│   └── Tuple[...]
├── Function
│   └── Fn[T] -> R
├── Object
│   ├── Struct
│   ├── Enum
│   └── Class
└── Custom
```

### 5.4 类型推断

```snaplang
// 自动推断为 Int
let a = 42

// 自动推断为 Float
let b = 3.14

// 自动推断为 String
let c = "hello"

// 自动推断为 List[Int]
let d = [1, 2, 3]

// 自动推断为 Map[String, Int]
let e = {"a": 1, "b": 2}

// 复杂类型推断
let f = items.filter(> 0).map(* 2).sum()
```

### 5.5 类型约束

```snaplang
// 基本约束
fn max[T: Comparable](a: T, b: T) -> T {
    if a > b then a else b
}

// 结构化约束
fn first[T: { size(): Int, get(Int): E }](list: T) -> E? {
    if list.size() > 0 then list.get(0) else nil
}

// 组合约束
fn process[T: Drawable & Serializable](item: T) {
    item.draw()
    save(item.toJSON())
}

// where 子句
fn serialize[T](value: T) -> String
    where T: Serializable
{
    return value.toJSON()
}
```

---

## 6. 语义规范

### 6.1 表达式求值

#### 6.1.1 求值顺序

```snaplang
// 从左到右求值
let result = a() + b() * c()

// 函数参数从左到右求值
doSomething(func1(), func2(), func3())

// 短路求值
let result = (condition and expensiveOperation())  // condition 为 false 时不执行

// nil 传播
let len = str?.length else 0
```

#### 6.1.2 表达式种类

```snaplang
// 原始表达式
42            // 字面量
name          // 变量
true          // 布尔字面量

// 前缀表达式
-not true     // 逻辑非
-42           // 负数
~0xFF         // 位反

// 后缀表达式
factorial(5)  // 函数调用
arr[0]        // 索引访问
obj.name      // 成员访问
fn_ptr()      // 函数调用

// 二元表达式
a + b         // 算术运算
a and b       // 逻辑与
a ?? b        // nil 合并

// 赋值表达式
x = 10        // 简单赋值
x += 5        // 复合赋值

// 块表达式
{ 
    let a = 1
    let b = 2
    a + b     // 块的最后一项为返回值
}
```

### 6.2 作用域规则

```snaplang
// 词法作用域
let x = 10
{
    let x = 20  // 遮蔽外层 x
    print(x)     // 20
}
print(x)          // 10

// 闭包捕获
fn makeAdder(base) {
    return |n| base + n
}

let add5 = makeAdder(5)
print(add5(10))  // 15
```

### 6.3 所有权与生命周期 (可选特性)

```snaplang
// 值语义 vs 引用语义
struct Data { ... }

// 值拷贝
let a = Data()
let b = a  // 深拷贝

// 引用语义
let c = ref Data()
let d = c  // 共享引用

// 借用
fn process(data: &Data) { ... }
fn mutate(data: &mut Data) { ... }
```

### 6.4 函数语义

```snaplang
// 参数传递: 值传递
fn modify(x) {
    x = 100  // 不影响原值
}

// 引用传递
fn modifyRef(x: &mut Number) {
    x = 100  // 影响原值
}

// 闭包捕获规则
// 1. 不可变借用
// 2. 可变借用
// 3. 移动

// 尾递归优化 (支持尾递归的语言实现)
fn factorial(n, acc = 1) = 
    if n <= 1 then acc 
    else factorial(n - 1, n * acc)
```

### 6.5 错误处理语义

```snaplang
// 错误作为值
type Result[T, E] = Ok(T) | Err(E)

fn divide(a, b) -> Result[Number, String] {
    if b == 0 then Err("Division by zero")
    else Ok(a / b)
}

// 使用 match 处理
match divide(10, 2) {
    Ok(v) => print("Result: {v}")
    Err(e) => print("Error: {e}")
}

// 使用 ? 操作符传播错误
fn calculate() -> Result[Number, String] {
    let a = readNumber()?
    let b = readNumber()?
    divide(a, b)
}
```

---

## 7. 内置函数与标准库

### 7.1 全局函数

```snaplang
// 类型转换
int(value)        // 转整数
float(value)      // 转浮点数
string(value)     // 转字符串
bool(value)       // 转布尔
list(value)       // 转列表
map(value)        // 转字典

// 类型检查
isNil(v)          // 是否为 nil
isInt(v)          // 是否为整数
isFloat(v)        // 是否为浮点数
isNumber(v)       // 是否为数字
isString(v)       // 是否为字符串
isBool(v)         // 是否为布尔
isList(v)         // 是否为列表
isMap(v)          // 是否为字典
isFunction(v)      // 是否为函数

// 输出
print(...values)  // 打印到标准输出
println(...values)// 打印并换行
format(template, ...args)  // 格式化字符串

// 输入
readLine()        // 读取一行
readChar()        // 读取一个字符

// 调试
assert(condition, message?)
debug(value)
typeof(value)     // 返回类型名字符串

// 程序控制
exit(code?)       // 退出程序
sleep(millis)     // 休眠
yield()           // 让出执行权
```

### 7.2 std.io 模块

```snaplang
// 文件操作
open(path, mode?)              // 打开文件
readFile(path)                 // 读取文件
writeFile(path, content)       // 写入文件
appendFile(path, content)      // 追加写入
exists(path)                   // 检查是否存在
mkdir(path)                    // 创建目录
remove(path)                   // 删除文件/目录

// 文件对象
let file = open("data.txt", "r")
file.read()                    // 读取全部
file.readLine()                // 读取一行
file.readLines()               // 读取所有行
file.write(content)            // 写入
file.close()                   // 关闭
defer file.close()             // defer 确保关闭

// 路径操作
path.join("a", "b", "c")
path.basename("/home/user/file.txt")
path.dirname("/home/user/file.txt")
path.extname("file.txt")
path.resolve("relative/path")
```

### 7.3 std.math 模块

```snaplang
// 常量
math.PI
math.E
math.TAU  // 2 * PI
math.INFINITY
math.NEG_INFINITY
math.NAN

// 基础数学
math.abs(x)
math.ceil(x)
math.floor(x)
math.round(x)
math.trunc(x)
math.sign(x)

// 指数对数
math.pow(base, exp)
math.sqrt(x)
math.cbrt(x)
math.exp(x)
math.log(x)
math.log10(x)
math.log2(x)

// 三角函数
math.sin(x)
math.cos(x)
math.tan(x)
math.asin(x)
math.acos(x)
math.atan(x)
math.atan2(y, x)

// 双曲函数
math.sinh(x)
math.cosh(x)
math.tanh(x)

// 其他
math.clamp(value, min, max)
math.mod(a, b)
math.gcd(a, b)
math.lcm(a, b)
math.random()                  // 0-1 随机数
math.randomInt(min, max)        // 随机整数
```

### 7.4 std.collections 模块

```snaplang
// List
let arr = [1, 2, 3, 4, 5]
arr.length()
arr.push(item)
arr.pop()
arr.shift()
arr.unshift(item)
arr.get(index)
arr.set(index, value)
arr.slice(start, end?)
arr.splice(index, count, ...items)
arr.concat(other)
arr.indexOf(item)
arr.includes(item)
arr.join(separator?)
arr.reverse()
arr.sort(compare?)
arr.forEach(fn)
arr.map(fn)
arr.filter(fn)
arr.reduce(fn, initial)
arr.find(fn)
arr.findIndex(fn)
arr.some(fn)
arr.every(fn)

// Map
let map = {"a": 1, "b": 2}
map.get(key)
map.set(key, value)
map.has(key)
map.delete(key)
map.keys()
map.values()
map.entries()
map.forEach(fn)
map.map(fn)

// Set
let set = {1, 2, 3}
set.add(item)
set.delete(item)
set.has(item)
set.size()
set.union(other)
set.intersection(other)
set.difference(other)
```

### 7.5 std.string 模块

```snaplang
let s = "  Hello, World!  "

// 查询
s.length()
s.isEmpty()
s.contains(substring)
s.startsWith(prefix)
s.endsWith(suffix)
s.indexOf(substring)
s.lastIndexOf(substring)

// 操作
s.trim()
s.trimStart()
s.trimEnd()
s.upper()
s.lower()
s.capitalize()
s.replace(old, new)
s.replaceAll(old, new)
s.padStart(length, char?)
s.padEnd(length, char?)
s.repeat(count)

// 分割与连接
s.split(separator)
s.chars()
s.lines()

String.join(separator, ...items)

// 匹配
s.matches(pattern)       // 正则匹配
s.match(pattern)         // 首个匹配
s.replace(pattern, replacement)
s.split(pattern)

// 插值 (使用模板)
let name = "Alice"
let greeting = s"Hello, {name}!"
```

### 7.6 std.time 模块

```snaplang
// 获取当前时间
time.now()                    // Date 对象

// Date 方法
let date = time.now()
date.year()
date.month()                  // 1-12
date.day()                    // 1-31
date.hour()                   // 0-23
date.minute()                 // 0-59
date.second()                 // 0-59
date.millisecond()
date.weekday()                // 0-6

// 时间戳
date.timestamp()               // 秒
date.timestampMs()            // 毫秒
time.fromTimestamp(sec)
time.fromTimestampMs(ms)

// 格式化
date.format("YYYY-MM-DD HH:mm:ss")
date.format("YYYY年MM月DD日")

// 解析
time.parse("2025-06-19", "YYYY-MM-DD")
time.parse("2025-06-19 10:30:00", "YYYY-MM-DD HH:mm:ss")

// 睡眠
time.sleep(1000)              // 毫秒
```

### 7.7 std.regex 模块

```snaplang
// 创建正则
let pattern = regex(r"\d{3}-\d{4}")

// 匹配
pattern.matches("123-4567")    // bool
pattern.find("123-4567")       // Match?
pattern.findAll("123-4567")    // List[Match]

// 替换
pattern.replace("123-4567", "***-****")
pattern.replaceAll(str, replacement, limit?)

// 分割
pattern.split("a1b2c3")        // ["a", "b", "c"]
```

### 7.8 办公软件专用模块

#### std.sheet 模块 (电子表格)

```snaplang
// 工作簿操作
let wb = sheet.open("budget.xlsx")
wb.sheets()                   // 获取所有工作表
wb.createSheet("Summary")
wb.deleteSheet("Temp")
wb.save()
wb.close()

// 工作表操作
let ws = wb.activeSheet()
ws.name()
ws.setName("New Name")
ws.rowCount()
ws.colCount()
ws.freeze(row?, col?)

// 单元格操作
ws.get(cell)                   // 获取单元格 (如 "A1")
ws.get(row, col)              // 按行列获取
ws.set(cell, value)           // 设置单元格
ws.set(row, col, value)
ws.getRange(range)            // 获取区域 (如 "A1:C10")
ws.getColumn(col)
ws.getRow(row)

// 单元格属性
ws.cell(cell).value
ws.cell(cell).formula
ws.cell(cell).font
ws.cell(cell).fill
ws.cell(cell).border
ws.cell(cell).alignment
ws.cell(cell).numberFormat

// 公式
ws.formula("=SUM(A1:A10)")
ws.formula("=VLOOKUP(A1, B:C, 2, FALSE)")
ws.evaluate("A1 + B1")

// 样式
ws.applyFont(cell, name: "Arial", size: 12, bold: true)
ws.applyFill(cell, color: "#FF0000")
ws.applyBorder(cell, style: "thin")
ws.applyAlignment(cell, h: "center", v: "middle")

// 数据操作
ws.sort(range, column: 1, ascending: true)
ws.filter(range, criteria)
ws.find(findWhat, inRange?)

// 导入导出
sheet.toArray(range)          // 转为数组
sheet.fromArray(array, startCell?)
sheet.toCSV(path?)
sheet.fromCSV(path)

// 图表
ws.addChart(type: "bar", dataRange: "A1:B10", title: "Sales")
```

#### std.doc 模块 (文档)

```snaplang
// 文档操作
let doc = doc.open("report.docx")
doc.create()
doc.save()
doc.close()

// 段落
doc.addParagraph("标题", style: "Heading1")
doc.addParagraph("正文内容")
doc.addParagraph()
doc.paragraphs()              // 获取所有段落
doc.paragraph(0)              // 获取指定段落

// 文本
para.text()
para.setText("新文本")
para.format(font: "Arial", size: 12)
para.bold()
para.italic()
para.underline()
para.color("#333333")

// 表格
let table = doc.addTable(rows: 3, cols: 3)
table.cell(0, 0).text = "标题"
table.cell(0, 0).merge()
table.addRow()
table.addColumn()
table.deleteRow(index)
table.deleteColumn(index)

// 图片
doc.addImage("chart.png", width: 300, height: 200)

// 列表
doc.addList(["项1", "项2", "项3"], ordered: false)

// 书签
doc.addBookmark("section1")
doc.gotoBookmark("section1")

// 查找替换
doc.find("旧文本")
doc.replace("旧文本", "新文本")
doc.replaceAll("旧", "新")
```

#### std.slide 模块 (演示文稿)

```snaplang
// 演示文稿操作
let ppt = slide.open("presentation.pptx")
ppt.create()
ppt.save()
ppt.close()

// 幻灯片
ppt.slides()                  // 所有幻灯片
ppt.addSlide(layout: "Title")
ppt.deleteSlide(index)
ppt.duplicateSlide(index)
ppt.reorderSlide(from, to)

// 当前幻灯片
let current = ppt.currentSlide()
current.index()

// 形状
current.addText("标题", x: 100, y: 100, w: 400, h: 50)
current.addImage("photo.jpg", x: 100, y: 200)
current.addShape("rectangle", x: 0, y: 0, w: 720, h: 540)
current.addChart(type: "pie", data: data, x: 100, y: 100)

// 文本框
let textBox = current.addTextBox()
textBox.text = "Hello"
textBox.font(name: "Arial", size: 24)
textBox.alignment("center", "middle")
textBox.color("#000000")
textBox.background("transparent")

// 母版
ppt.masterSlide().apply()
ppt.layout("Title Slide").apply()

// 动画
textBox.animate(type: "fadeIn", duration: 500)
textBox.animate(type: "flyIn", direction: "left", duration: 300)

// 导出
ppt.exportPDF("output.pdf")
ppt.exportImages("png", "slide_{n}.png")
```

---

## 8. 编译器架构

### 8.1 编译器 pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                         SnapLang 编译器流程                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  源代码 ──► 词法分析 ──► 语法分析 ──► 语义分析 ──► 优化 ──► 代码生成 │
│  (.snap)      ▼          ▼          ▼          ▼          ▼     │
│             Token     AST        AST+类型    IR         目标代码   │
│                       流         信息                                │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 词法分析器 (Lexer)

```
职责：
  - 将源代码字符串转换为 Token 流
  - 识别关键字、标识符、字面量、运算符
  - 过滤注释和空白
  - 记录行号和列号用于错误定位

输出：
  Token { type, value, line, column, length }

示例：
  let x = 42 + y
  =>
  [LET, IDENT("x"), ASSIGN, INT(42), PLUS, IDENT("y"), EOF]
```

### 8.3 语法分析器 (Parser)

```
职责：
  - 将 Token 流转换为抽象语法树 (AST)
  - 检测语法错误并生成友好错误信息
  - 支持增量解析（用于 IDE）

输出：
  AST 节点：
    - Program
    - FunctionDecl
    - VariableDecl
    - IfExpr
    - ForLoop
    - MatchExpr
    - BinExpr
    - CallExpr
    - ...

示例：
  fn add(a, b) = a + b
  =>
  FunctionDecl {
    name: "add",
    params: [Param("a"), Param("b")],
    body: BinExpr(+, Var("a"), Var("b"))
  }
```

### 8.4 语义分析器 (Type Checker)

```
职责：
  - 类型推断与检查
  - 作用域分析
  - 符号表管理
  - 错误类型检查

输出：
  - 带类型标注的 AST
  - 符号表
  - 错误列表

类型检查规则：
  - 表达式类型推断
  - 函数调用参数匹配
  - 类型兼容性检查
  - 泛型实例化
```

### 8.5 中间表示 (IR)

```snaplang
// 高级 IR (HIR)
// 接近源码结构，便于优化

fn add(a: Int, b: Int) -> Int {
    return a + b
}

// =>
// function add(a: i64, b: i64) -> i64 {
//     %0 = add a, b
//     ret %0
// }

// 低级 IR (LIR)
// 接近机器指令，便于代码生成

// %0 = alloca i64
// store %0, a
// %1 = load %0
// ...
```

### 8.6 代码生成器 (Codegen)

```
目标平台：
  - JVM 字节码 (Java 虚拟机)
  - WASM (WebAssembly)
  - LLVM IR (本地编译)
  - 自定义字节码 (虚拟机解释执行)

代码生成策略：
  - 树遍历翻译
  - SSA 形式
  - 寄存器分配
  - 指令选择
```

### 8.7 编译器选项

```snaplang
// 编译选项
snapc --help

// 基本用法
snapc input.snap -o output
snapc input.snap --emit=asm  // 输出汇编
snapc input.snap --emit=llvm // 输出 LLVM IR

// 优化级别
snapc input.snap -O0  // 无优化
snapc input.snap -O1  // 基础优化
snapc input.snap -O2  // 标准优化
snapc input.snap -O3  // 激进优化

// 输出格式
snapc input.snap --format=cbor  // 紧凑字节码
snapc input.snap --format=json   // JSON 格式

// 调试
snapc input.snap -g             // 生成调试信息
snapc input.snap --ir-dump      // 输出 IR
snapc input.snap --ast-dump     // 输出 AST
```

---

## 9. 运行时引擎

### 9.1 运行时架构

```
┌─────────────────────────────────────────────────────────────┐
│                         运行时架构                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │  堆内存     │    │  调用栈     │    │  GC 堆      │      │
│  │  (Heap)    │    │ (Call Stack)│    │             │      │
│  └─────────────┘    └─────────────┘    └─────────────┘      │
│         │                 │                  │             │
│         └─────────────────┼──────────────────┘             │
│                           ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    虚拟机核心                        │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐       │   │
│  │  │ 指令分发  │ │ 帧管理    │ │ 异常处理  │       │   │
│  │  └───────────┘ └───────────┘ └───────────┘       │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    标准库                            │   │
│  │  std.io | std.math | std.collections | std.sheet   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 字节码指令集

```
┌─────────────────────────────────────────────────────────────┐
│                       字节码指令                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  // 常量加载                                                │
│  LDC <index>         // 加载常量池中的常量                   │
│  LDCI <int>          // 加载整数常量                        │
│  LDCF <float>        // 加载浮点常量                        │
│  LDCS <string>       // 加载字符串常量                      │
│                                                              │
│  // 局部变量                                                │
│  LDL <index>         // 加载局部变量                        │
│  LDLX <level, index> // 加载上层的局部变量 (闭包)            │
│  STL <index>         // 存储局部变量                        │
│                                                              │
│  // 全局变量                                                │
│  LDG <index>         // 加载全局变量                        │
│  STG <index>         // 存储全局变量                        │
│                                                              │
│  // 算术运算                                                │
│  ADD                 // 加法                                │
│  SUB                 // 减法                                │
│  MUL                 // 乘法                                │
│  DIV                 // 除法                                │
│  MOD                 // 取模                                │
│  NEG                 // 取反                                │
│                                                              │
│  // 比较运算                                                │
│  EQ                  // 等于                                │
│  NE                  // 不等于                              │
│  LT                  // 小于                                │
│  GT                  // 大于                                │
│  LE                  // 小于等于                            │
│  GE                  // 大于等于                            │
│                                                              │
│  // 逻辑运算                                                │
│  AND                 // 逻辑与                              │
│  OR                  // 逻辑或                              │
│  NOT                 // 逻辑非                              │
│                                                              │
│  // 控制流                                                  │
│  JMP <offset>        // 无条件跳转                          │
│  JMPF <offset>       // 条件为假时跳转                      │
│  JMPT <offset>       // 条件为真时跳转                      │
│  CALL <func, argc>   // 函数调用                            │
│  RET                 // 函数返回                            │
│                                                              │
│  // 对象操作                                                │
│  NEW <type>          // 创建对象                            │
│  GET <index>         // 获取属性                            │
│  SET <index>         // 设置属性                            │
│  IDX                 // 数组/字典索引                       │
│                                                              │
│  // 其他                                                    │
│  DUP                 // 复制栈顶                            │
│  DROP                // 丢弃栈顶                            │
│  HALT                // 停止执行                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 9.3 内存管理

#### 9.3.1 内存布局

```
┌────────────────────────────────────────┐
│           高地址                        │
├────────────────────────────────────────┤
│            栈 (Stack)                  │
│   - 函数调用帧                         │
│   - 局部变量                           │
│   - 返回地址                           │
├────────────────────────────────────────┤
│            ...                         │
├────────────────────────────────────────┤
│            堆 (Heap)                   │
│   - 对象                               │
│   - 数组                               │
│   - 字符串                             │
│   - 闭包                               │
├────────────────────────────────────────┤
│           全局/常量区                   │
│   - 全局变量                           │
│   - 常量池                             │
├────────────────────────────────────────┤
│           低地址                        │
└────────────────────────────────────────┘
```

#### 9.3.2 垃圾回收策略

```snaplang
// 垃圾回收器设计

GC 算法选择：
  - 世代收集 (Generational GC)
  - 标记-清除 (Mark-Sweep)
  - 引用计数 (Reference Counting) - 用于循环引用检测

回收阶段：
  1. 标记 (Mark)
     - 从根集合开始遍历
     - 标记所有可达对象
     
  2. 清除 (Sweep)
     - 回收未标记对象的内存
     
  3. 压缩 (Compact) [可选]
     - 移动存活对象
     - 减少内存碎片

触发条件：
  - 内存分配超过阈值
  - 定时触发
  - 手动调用
```

### 9.4 异常处理机制

```snaplang
// 异常传播机制

异常类型：
  - 内置异常：SyntaxError, TypeError, ValueError, RuntimeError
  - 用户自定义异常

传播流程：
  1. 异常抛出
     throw MyException("error message")
     
  2. 栈展开 (Stack Unwinding)
     - 查找匹配的 catch 块
     - 执行 finally 块
     
  3. 错误恢复
     - 执行错误处理代码
     - 或传播到上级调用者
```

---

## 10. API 与扩展机制

### 10.1 外部函数接口 (FFI)

```snaplang
// 声明外部函数
@ffi.import("libc", "strlen")
fn strlen(s: &CChar) -> Int

@ffi.import("libm", "sin")
fn sin(x: Float) -> Float

// 调用外部库
let len = strlen("Hello")
let result = sin(3.14)
```

### 10.2 原生扩展

```snaplang
// 定义原生函数
@native
fn platform_info() -> String {
    return Runtime.getPlatformInfo()
}

@native
fn spawn_thread(func: Fn()) -> Thread {
    return Runtime.createThread(func)
}
```

### 10.3 插件系统

```snaplang
// snap-plugin.toml
[plugin]
name = "excel-import"
version = "1.0.0"
author = "Author Name"
description = "Excel file import plugin"

[dependencies]
std.sheet = ">=1.0.0"

[permissions]
filesystem = "read"
network = "none"

// 使用插件
import plugin "./plugins/excel-import.snap"

fn main() {
    let data = excel.import("data.xlsx")
    process(data)
}
```

### 10.4 宏系统

```snaplang
// 编译时元编程

// 简单宏
macro unless(condition, body) {
    return `if !(condition) { body }
}

unless isValid {
    print("Invalid!")
}

// 属性宏
@logged
fn process() {
    // 自动记录函数调用
}

// 派生宏
#[derive(Debug, Clone, Serialize)]
struct Config {
    name: String
    value: Int
}
```

---

## 11. 办公软件集成

### 11.1 集成架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Snap 办公套件集成                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│    │  SnapSheet   │  │   SnapDoc    │  │  SnapSlide   │     │
│    │  (电子表格)   │  │   (文档)     │  │  (演示文稿)   │     │
│    └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│           │                  │                  │             │
│           └──────────────────┼──────────────────┘             │
│                              ▼                                │
│                    ┌──────────────────┐                      │
│                    │    std.sheet     │                      │
│                    │    std.doc       │                      │
│                    │    std.slide     │                      │
│                    └────────┬─────────┘                      │
│                             │                                │
│                    ┌────────▼─────────┐                      │
│                    │    SnapLang      │                      │
│                    │    运行时引擎    │                      │
│                    └────────┬─────────┘                      │
│                             │                                │
│                    ┌────────▼─────────┐                      │
│                    │   标准库/FFI    │                      │
│                    └─────────────────┘                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 11.2 脚本执行模型

```snaplang
// 在办公软件中执行脚本

执行模式：
  1. 即时执行 (REPL)
     > let sum = 0
     > for i in 1..=10 { sum += i }
     > print(sum)
     55
     
  2. 脚本文件
     snapc script.snap -o script.snb
     app.loadScript("script.snb")
     
  3. 宏命令
     @Macro
     fn batchProcess() {
         // 批量处理逻辑
     }
     
  4. 事件驱动
     @OnChange("A1")
     fn onCellChange(cell) {
         recalculate()
     }
     
  5. 定时任务
     @Scheduled("0 0 * * *")  // 每天午夜
     fn dailyBackup() {
         saveAll()
     }
```

### 11.3 安全模型

```snaplang
// 沙箱执行环境

权限控制：
  - 文件系统访问
  - 网络请求
  - 系统调用
  - 其他应用数据访问

权限声明：
  // snap-manifest.toml
  [permissions]
  filesystem = "read"           // 只读文件系统
  network = "none"              // 禁止网络
  other-apps = "none"           // 禁止访问其他应用

受限 API：
  - 高风险 API 需要显式权限
  - 敏感操作需要用户确认
  - 执行日志记录
```

---

## 12. 路线图

### 12.1 实现阶段

```
阶段 1: 核心语言 (v0.1 - v0.3)
  ├── v0.1: 词法分析器、语法分析器
  ├── v0.2: 类型系统、基本运行时
  └── v0.3: 标准库核心 (io, math, collections)

阶段 2: 功能完善 (v0.4 - v0.6)
  ├── v0.4: 错误处理、模块系统
  ├── v0.5: 泛型、接口
  └── v0.6: 闭包、异步支持

阶段 3: 性能优化 (v0.7 - v0.8)
  ├── v0.7: JIT 编译器
  └── v0.8: 垃圾回收器

阶段 4: 办公集成 (v1.0)
  ├── std.sheet 模块
  ├── std.doc 模块
  └── std.slide 模块

阶段 5: 生态建设 (v1.1+)
  ├── 包管理器
  ├── IDE 插件
  ├── 文档网站
  └── 社区插件
```

### 12.2 技术选型

```
开发语言：Rust (编译器/运行时) + TypeScript (工具链/IDE)

技术栈：
  - 词法/语法分析: 手写解析器 / Pratt Parser
  - IR: 自定义 SSA 形式
  - 优化: LLVM (长期) / 手写优化 (短期)
  - GC: 世代收集器
  - FFI: C ABI 兼容
```

---

## 附录

### A. 示例代码

```snaplang
// SnapLang 示例程序

// 模块导入
import std.io
import std.math as math

// 常量
const PI = 3.14159

// 函数定义
fn calculateArea(radius: Float) -> Float {
    return PI * math.pow(radius, 2)
}

fn greet(name: String) -> String {
    return "Hello, {name}!"
}

// 主函数
fn main() {
    // 变量声明
    let radius = 5.0
    let name = "World"
    
    // 计算并输出
    let area = calculateArea(radius)
    println("Circle with radius {radius} has area: {area}")
    
    // 条件表达式
    let status = if area > 50 then "Large" else "Small"
    println("Status: {status}")
    
    // 循环
    for i in 1..=5 {
        println("Count: {i}")
    }
    
    // 使用 lambda
    let numbers = [3, 1, 4, 1, 5, 9, 2, 6]
    let evens = numbers.filter(|n| n % 2 == 0)
    let doubled = evens.map(|n| n * 2)
    println("Doubled evens: {doubled}")
    
    // Match 表达式
    match area {
        a if a < 25 => print("Small circle")
        a if a < 100 => print("Medium circle")
        _ => print("Large circle")
    }
}
```

### B. 错误代码参考

| 错误码 | 含义 |
|--------|------|
| E0001 | 词法错误：无法识别的字符 |
| E0002 | 语法错误：意外的 Token |
| E0003 | 语义错误：未定义的标识符 |
| E0004 | 类型错误：类型不匹配 |
| E0005 | 运行时错误：除零错误 |
| E0006 | 运行时错误：空指针 |
| E0007 | 运行时错误：数组越界 |
| E0008 | 模块错误：找不到模块 |
| E0009 | 权限错误：访问被拒绝 |

---

> **设计理念**：SnapLang 旨在成为连接人类创造力与办公自动化的桥梁，让每个人都能通过简洁、强大的脚本语言，将重复性工作转化为自动化流程。

**文档版本**: 1.0.0-draft  
**维护者**: SnapLang Team  
**许可**: MIT License
