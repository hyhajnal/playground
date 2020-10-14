const Vue = require('vue');
const server = require('express')();
const fs = require('fs');
const path = require('path');

const template = fs.readFileSync(path.join(__dirname, './index.template.html'), 'utf-8');

const renderer = require('vue-server-renderer').createRenderer({
    template,
});

const context = {
    title: 'vue ssr',
    metas: `
        <meta name="keyword" content="vue,ssr">
        <meta name="description" content="vue srr demo">
    `,
};

server.get('*', (req, res) => {
    const app = new Vue({
        data: {
            url: req.url
        },
        template: `<div>访问的 URL 是： {{ url }}</div>`,
    });

    renderer
        .renderToString(app, context, (err, html) => {

            if (err) {
                console.log(err);
                res.status(500).end('Internal Server Error')
                return;
            }

            res.end(html);
        });
})

server.listen(7001);