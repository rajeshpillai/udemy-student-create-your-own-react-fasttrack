// 1. createElement Stub
// 2. createElement Basic Implementation
// 3. createElement Handle true/false short circuiting

const TinyReact = (function () {
    function createElement(type, attributes = {}, ...children) {
        const childElements = [].concat(...children).map(
            child => {
                if (child != null && child !== true && child !== false) {
                    return child instanceof Object
                        ? child
                        : createElement("text", {
                            textContent: child
                        })
                }
            }
        );
        return {
            type,
            children: childElements,
            props: Object.assign({ children: childElements }, attributes)
        }
    }

    return {
        createElement
    }
}());