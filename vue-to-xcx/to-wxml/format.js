const beautifyHtml = require('js-beautify').html

export default function formatHtml (data) {
  return beautifyHtml(data, {
    indent_size: 2,
    space_after_anon_function: true,
    brace_style: 'collapse',
    indent_char: ' ',
    preserve_newlines: true,
    content_unformatted: [],
    // Whether existing line breaks before elements should be preserved (only works before elements, not inside tags or for text)
    // unformatted: ['a', 'span', 'img', 'code', 'pre', 'sub', 'sup', 'em', 'strong', 'b', 'i', 'u', 'strike', 'big', 'small', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    // unformatted: ['a', 'img', 'code', 'pre', 'sub', 'sup', 'em', 'strong', 'b', 'u', 'strike', 'big', 'small', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    unformatted: [],
    // List of tags that should not be reformatted
    indent_scripts: 'keep',
    // [keep|separate|normal]
    eol: '\n',
    indent_level: 0,
    indent_with_tabs: false,
    max_preserve_newlines: 10,
    jslint_happy: false,
    keep_array_indentation: false,
    keep_function_indentation: false,
    space_before_conditional: true,
    break_chained_methods: false,
    eval_code: false,
    unescape_strings: false,
    wrap_line_length: 0,
    wrap_attributes: 'auto',
    wrap_attributes_indent_size: 2,
    end_with_newline: false
  })
}