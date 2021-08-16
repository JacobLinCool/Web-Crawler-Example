const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

// 搜尋深度
const depth = 1;

main();

// 主程式
async function main() {
    const books = {};
    const failed = [];

    const homepageDOM = await getDom("https://www.tenlong.com.tw/");
    let links = getProductLinks(homepageDOM);

    for (let i = 0; i < depth; i++) {
        console.log(`搜尋深度 ${i + 1}/${depth}: 找到 ${links.length} 個連結`);
        const newLinks = [];
        for (let j = 0; j < links.length; j++) {
            console.log(`執行中: 搜尋深度 ${i + 1} 連結 ${j + 1}`);
            const link = links[j];
            if (books[link.match(/\d{13}/)[0]]) continue;
            const dom = await getDom(link);
            const bookInfo = getBookInfo(dom);
            if (bookInfo) books[bookInfo.ISBN13] = bookInfo;
            else failed.push(link);
            const newLinksX = getProductLinks(dom);
            newLinks.push(...newLinksX);
        }

        console.log(`已完成 ${Object.keys(books).length} 本書籍資訊收集`);
        fs.writeFileSync("./books.json", JSON.stringify(books, null, 2));
        console.log(`有 ${failed.length} 次收集發生錯誤`);
        fs.writeFileSync("./failed.json", JSON.stringify(failed, null, 2));

        links = newLinks;
    }
}

// 抓取指定網頁並返回 DOM
async function getDom(url) {
    const response = await fetch(url).then((r) => r.text());
    const dom = new JSDOM(response);
    return dom;
}

// 以 DOM 為資料，抓取書籍資訊
function getBookInfo(dom) {
    try {
        const body = dom.window.document.body;

        const title = body.querySelector(".item-title").innerHTML.trim();
        const author = body.querySelector(".item-author").innerHTML.trim();
        const ISBN = +body.querySelector("[title='International Standard Book Number']").parentElement.nextElementSibling.innerHTML.trim();
        const ISBN13 = +body.querySelector("[title='European Article Number']").parentElement.nextElementSibling.innerHTML.trim();

        return { title, author, ISBN, ISBN13 };
    } catch (err) {
        console.error(err);
        return null;
    }
}

// 以 DOM 為資料，抓取書籍連結
function getProductLinks(dom) {
    const prefix = "https://www.tenlong.com.tw/products/";
    const links = [
        ...new Set(
            [...dom.window.document.querySelectorAll("a[href^='/products/']")]
                .map((x) => {
                    if (x.href.match(/\d{13}/)) return prefix + x.href.match(/\d{13}/)[0] + "/";
                    else return null;
                })
                .filter(Boolean)
        ),
    ];

    return links;
}
