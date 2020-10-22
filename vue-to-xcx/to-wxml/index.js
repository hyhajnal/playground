function handleASTtoWXML(ast) {
    let forKeyArr = [];     // 记录for循环中的key
    let forKeyIndex = 0;    // 记录key

    function processNode(node, isRoot) {
        // 处理 a 标签
        if (node.tag === 'a') {

        }

        // 处理子元素
        if (node.children && node.children.length) {
            node.children.forEach(function (item) {
                processNode(item)
            })
        }

        if (node.type === 1) {
            // 处理 v-for
            if (node.for) {

            }
            // 把esle、else-if放到if中统一处理
        }
    }

    processNode(ast, true)
}