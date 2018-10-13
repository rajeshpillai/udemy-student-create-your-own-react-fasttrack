// 1. createElement Stub
// 2. createElement Basic Implementation
// 3. createElement Handle true/false short circuiting
// 4. createElement remove undefined nodes
// 5. rendering native DOM elements along with children
// 6. set dom attributes and events
// 7. diffing two trees of native DOM elements 
// 8. removing extra nodes
// 9. rendering functional component
// 10. passing props to functional component 
// 11. functional component diffing (remove extra nodes)
// 12. rendering stateful component 
// 13. passing props to stateful component
// 14. implement setState() method -> parameter as object
// 15. implement the stub for lifecycle method (TODO)
// 16. diffing stateful components  (ISSUE: new props coming as #text->object should be toString() in app)
// 17. Adding support for ref (todo)
// 18. More test cases, old and new types are different.


const TinyReact = (function () {
    function createElement(type, attributes = {}, ...children) {
        let childElements = [].concat(...children).reduce(
            (acc, child) => {
                if (child != null && child !== true && child !== false) {
                    if (child instanceof Object) {
                        acc.push(child);
                    } else {
                        acc.push(createElement("text", {
                            textContent: child
                        }));
                    }
                }
                return acc;
            }
            , []);
        return {
            type,
            children: childElements,
            props: Object.assign({ children: childElements }, attributes)
        }
    }

    const render = function (vdom, container, oldDom = container.firstChild) {
        diff(vdom, container, oldDom);
    }

    const diff = function (vdom, container, oldDom) {
        let oldvdom = oldDom && oldDom._virtualElement;
        let oldComponent = oldvdom && oldvdom.component;

        if (!oldDom) {
            mountElement(vdom, container, oldDom);
        }
        else if ((vdom.type !== oldvdom.type) && (typeof vdom.type !== "function")) {
            let newDomElement = createDomElement(vdom);  // todo:
            oldDom.parentNode.replaceChild(newDomElement, oldDom);
        }
        else if (typeof vdom.type === "function") {
            diffComponent(vdom, oldComponent, container, oldDom);
        }
        else if (oldvdom && oldvdom.type === vdom.type) {
            if (oldvdom.type === "text") {
                updateTextNode(oldDom, vdom, oldvdom);
            } else {
                updateDomElement(oldDom, vdom, oldvdom);
            }

            // Set a reference to updated vdom
            oldDom._virtualElement = vdom;

            // Recursively diff children..
            // Doing an index by index diffing (because we don't have keys yet)
            vdom.children.forEach((child, i) => {
                diff(child, oldDom, oldDom.childNodes[i]);
            });

            // Remove old dom nodes
            let oldNodes = oldDom.childNodes;
            if (oldNodes.length > vdom.children.length) {
                for (let i = oldNodes.length - 1; i >= vdom.children.length; i -= 1) {
                    let nodeToBeRemoved = oldNodes[i];
                    unmountNode(nodeToBeRemoved, oldDom);
                }
            }

        }
    }

    function createDomElement(vdom) {
        let newDomElement = null;
        if (vdom.type === "text") {
            newDomElement = document.createTextNode(vdom.props.textContent);
        } else {
            newDomElement = document.createElement(vdom.type);
            updateDomElement(newDomElement, vdom);
        }

        newDomElement._virtualElement = vdom;
        vdom.children.forEach((child) => {
            newDomElement.appendChild(createDomElement(child));
        });

        // Set refs
        if (vdom.props && vdom.props.ref) {
            vdom.props.ref(newDomElement);
        }

        return newDomElement;
    }

    function diffComponent(newVirtualElement, oldComponent, container, domElement) {

        if (isSameComponentType(oldComponent, newVirtualElement)) {
            updateComponent(newVirtualElement, oldComponent, container, domElement);
        } else {
            mountElement(newVirtualElement, container, domElement);
        }
    }

    function updateComponent(newVirtualElement, oldComponent, container, domElement) {

        // Lifecycle method
        oldComponent.componentWillReceiveProps(newVirtualElement.props);

        // Lifecycle method
        if (oldComponent.shouldComponentUpdate(newVirtualElement.props)) {
            const prevProps = oldComponent.props;

            // Invoke LifeCycle
            oldComponent.componentWillUpdate(
                newVirtualElement.props,
                oldComponent.state
            );

            // Update component
            oldComponent.updateProps(newVirtualElement.props);

            // Call Render
            // Generate new vdom
            const nextElement = oldComponent.render();
            nextElement.component = oldComponent;

            // Recursively diff again
            diff(nextElement, container, domElement, oldComponent);

            // Invoke LifeCycle
            oldComponent.componentDidUpdate(prevProps);

        }

    }

    function isSameComponentType(oldComponent, newVirtualElement) {
        return oldComponent && newVirtualElement.type === oldComponent.constructor;
    }

    const mountElement = function (vdom, container, oldDom) {
        if (isFunction(vdom)) {
            return mountComponent(vdom, container, oldDom);
        } else {
            return mountSimpleNode(vdom, container, oldDom);
        }
    }

    function isFunction(obj) {
        return obj && 'function' === typeof obj.type;
    }

    function isFunctionalComponent(vnode) {
        let nodeType = vnode && vnode.type;
        return nodeType && isFunction(vnode)
            && !(nodeType.prototype && nodeType.prototype.render);
    }

    function buildFunctionalComponent(vnode, context) {
        return vnode.type(vnode.props || {});
    }


    function buildStatefulComponent(virtualElement) {
        const component = new virtualElement.type(virtualElement.props);
        const nextElement = component.render();
        nextElement.component = component;
        return nextElement;
    }

    function mountComponent(vdom, container, oldDomElement) {
        let nextvDom = null, component = null, newDomElement = null;
        if (isFunctionalComponent(vdom)) {
            nextvDom = buildFunctionalComponent(vdom);
        } else {
            nextvDom = buildStatefulComponent(vdom);
            component = nextvDom.component;
        }

        // Recursively render child components
        if (isFunction(nextvDom)) {
            return mountComponent(nextvDom, container, oldDomElement);
        } else {
            newDomElement = mountElement(nextvDom, container, oldDomElement);
        }

        if (component) {
            component.componentDidMount();  // Life cycle method
            if (component.props.ref) {
                component.props.ref(component);
            }
        }

        return newDomElement;
    }

    function unmountNode(domElement, parentComponent) {
        const virtualElement = domElement._virtualElement;
        if (!virtualElement) {
            domElement.remove();
            return;
        }

        // If component exist
        let oldComponent = domElement._virtualElement.component;
        if (oldComponent) {
            oldComponent.componentWillUnmount();
        }

        // Recursive calls agains
        while (domElement.childNodes.length > 0) {
            unmountNode(domElement.firstChild);
        }

        if (virtualElement.props && virtualElement.props.ref) {
            virtualElement.props.ref(null);
        }

        // Clear out event handlers
        Object.keys(virtualElement.props).forEach(propName => {
            if (propName.slice(0, 2) === "on") {
                const event = propName.toLowerCase().slice(2);
                const handler = virtualElement.props[propName];
                domElement.removeEventListener(event, handler);
            }
        });

        domElement.remove();
    }

    function updateTextNode(domElement, newVirtualElement, oldVirtualElement) {
        if (newVirtualElement.props.textContent !== oldVirtualElement.props.textContent) {
            domElement.textContent = newVirtualElement.props.textContent;
        }
        // Set a reference to the newvddom in oldDom
        domElement._virtualElement = newVirtualElement;
    }


    const mountSimpleNode = function (vdom, container, oldDomElement, parentComponent) {
        let newDomElement = null;
        const nextSibling = oldDomElement && oldDomElement.nextSibling;

        if (vdom.type === "text") {
            newDomElement = document.createTextNode(vdom.props.textContent);
        } else {
            newDomElement = document.createElement(vdom.type);
            updateDomElement(newDomElement, vdom);
        }

        // Setting reference to vdom to dom
        newDomElement._virtualElement = vdom;

        // TODO: Remove old nodes
        if (oldDomElement) {
            unmountNode(oldDomElement, parentComponent);
        }

        if (nextSibling) {
            container.insertBefore(newDomElement, nextSibling);
        } else {
            container.appendChild(newDomElement);
        }

        let component = vdom.component;
        if (component) {
            component.setDomElement(newDomElement);
        }

        vdom.children.forEach(child => {
            mountElement(child, newDomElement);
        });

        if (vdom.props && vdom.props.ref) {
            vdom.props.ref(newDomElement);
        }

    }

    function updateDomElement(domElement, newVirtualElement, oldVirtualElement = {}) {
        const newProps = newVirtualElement.props || {};
        const oldProps = oldVirtualElement.props || {};
        Object.keys(newProps).forEach(propName => {
            const newProp = newProps[propName];
            const oldProp = oldProps[propName];
            if (newProp !== oldProp) {
                if (propName.slice(0, 2) === "on") {
                    // prop is an event handler
                    const eventName = propName.toLowerCase().slice(2);
                    domElement.addEventListener(eventName, newProp, false);
                    if (oldProp) {
                        domElement.removeEventListener(eventName, oldProp, false);
                    }
                } else if (propName === "value" || propName === "checked") {
                    // this are special attributes that cannot be set
                    // using setAttribute
                    domElement[propName] = newProp;
                } else if (propName !== "children") {
                    // ignore the 'children' prop
                    if (propName === "className") {
                        domElement.setAttribute("class", newProps[propName]);
                    } else {
                        domElement.setAttribute(propName, newProps[propName]);
                    }
                }
            }
        });
        // remove oldProps
        Object.keys(oldProps).forEach(propName => {
            const newProp = newProps[propName];
            const oldProp = oldProps[propName];
            if (!newProp) {
                if (propName.slice(0, 2) === "on") {
                    // prop is an event handler
                    domElement.removeEventListener(propName, oldProp, false);
                } else if (propName !== "children") {
                    // ignore the 'children' prop
                    domElement.removeAttribute(propName);
                }
            }
        });
    }

    class Component {
        constructor(props) {
            this.props = props;
            this.state = {};
            this.prevState = {};
        }

        setState(nextState) {
            if (!this.prevState) this.prevState = this.state;

            this.state = Object.assign({}, this.state, nextState);

            let dom = this.getDomElement();
            let container = dom.parentNode;

            let newvdom = this.render();

            // Recursively diff
            diff(newvdom, container, dom);

        }

        // Helper methods
        setDomElement(dom) {
            this._dom = dom;
        }

        getDomElement() {
            return this._dom;
        }

        updateProps(props) {
            this.props = props;
        }

        // Lifecycle methods
        componentWillMount() { }
        componentDidMount() { }
        componentWillReceiveProps(nextProps) { }

        shouldComponentUpdate(nextProps, nextState) {
            return nextProps != this.props || nextState != this.state;
        }

        componentWillUpdate(nextProps, nextState) { }

        componentDidUpdate(prevProps, prevState) { }

        componentWillUnmount() { }
    }


    return {
        createElement,
        render,
        Component
    }
}());