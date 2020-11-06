/**
 * 1. npm包，需要转换到npm包的路径
 * import LazyImage from '@meili/mgj-lazy-image';
 * <import src="../../../../page-core/componentClass/internalComponents/mvwImage/index.wxml" /> 
 */

/**
 * 2. 内置组件
 * import countdown from '@wxSource/components/countdown/index';
 * import countdown from "../../../components/countdown/index";
 */

/**
 * 3. 普通的组件
 * import priceBanner from '../../components/priceBanner/index';
 * <import src="../../components/priceBanner/index.wxml" />
 */

const gen_import_css_code = (relyFileList) => {
    let code = ''
    relyFileList.forEach((file) => {
        var extname = path.extname(file);
        if (extname === '.vue') {
            const filePath = file.replace(/\.vue$/, '.wxss');
            code += "@import \"".concat(filePath, "\";\n");
        }
    })
    return code;
}

const gen_import_tpl_code = (relyFileList) => {
    let code = ''
    relyFileList.forEach((file) => {
        var extname = path.extname(file);
        if (extname === '.vue') {
            let filePath = file.replace(/^\.\//, '').replace(/\.vue$/, '.wxml');
            code += "@import \"".concat(filePath, "\";\n");
            filePath = filePath.replace(/^\.\//, '');
            code += "<import src=\"".concat(filePath, "\" />\n");
        }
    })
    return code;
}

module.exports = {
    gen_import_css_code,
    gen_import_tpl_code
}