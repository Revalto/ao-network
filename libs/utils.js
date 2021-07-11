const JSONDecodeByString = (str) => {
    try {
        const json = JSON.parse(str);

        return json;
    } catch(e) {
        return str;
    }  
}

const fragmentDecode = (input) => {
    return Object.values(input).map(res => {
        return res.sendfragData || '';
    }).join('');
};

const normalizeObject = (obj) => {
    let output = {};

    for (let [key, value] of Object.entries(obj)) {
        if(typeof value === 'object' && Array.isArray(value)) {
            value = value.map(res => JSONDecodeByString(res));
        } else if(typeof value === 'string') {
            value = JSONDecodeByString(value);
        }

        output[key] = value;
    }

    return output;
}

module.exports = {
    JSONDecodeByString,
    fragmentDecode,
    normalizeObject
};