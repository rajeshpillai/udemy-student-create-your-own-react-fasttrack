/** @jsx TinyReact.createElement */

/*** Step 1,2,3,4 - createElement */

const root = document.getElementById("root");

var Step1 = (
  <div>
    <h1 className="header">Hello Tiny React!</h1>
    <h2>(coding nirvana)</h2>
    <div>nested 1<div>nested 1.1</div></div>
    <h3>(OBSERVE: This will change)</h3>
    {2 == 1 && <div>Render this if 2==1</div>}
    {2 == 2 && <div>{2}</div>}
    <span>This is a text</span>
    <button onClick={() => alert("Hi!")}>Click me!</button>
    <h3>This will be deleted</h3>
    2,3
  </div>
);

console.log(Step1);

// Step 5, 6
//TinyReact.render(Step1, root);

var Step2 = (
  <div>
    <h1 className="header">Hello Tiny React!</h1>
    <h2>(coding nirvana)</h2>
    <div>nested 1<div>nested 1.1</div></div>
    <h3 style="background-color:yellow">(OBSERVE: I said it!!)</h3>
    {2 == 1 && <div>Render this if 2==1</div>}
    {2 == 2 && <div>{2}</div>}
    <span>Something goes here...</span>
    <button onClick={() => alert("This has changed!")}>Click me!</button>
  </div>
);

// setTimeout(() => {
//   alert("Re-rendering...");
//   TinyReact.render(Step2, root);
// }, 4000);

// Functional Component
const Heart = (props) => <span style={props.style}>&hearts;</span>;

// function Heart() {
//   return (
//     <span>&hearts;</span>
//   );
// }


//TinyReact.render(<Heart style="color:red" />, root);

const Button = (props) => <button onClick={props.onClick}>{props.children}</button>;


// Testing functional components, props, nested components

const Greeting = function (props) {
  return (
    <div className="greeting">
      <h2>Welcome {props.message}</h2>
      <Button onClick={() => alert("I love React")}>I <Heart /> React</Button>
    </div>
  );
}

//TinyReact.render(<Greeting message="Good day!" />, root);

// setTimeout(() => {
//   alert("Re-rendering...");
//   TinyReact.render(<Greeting message="Good Night!" />, root);
// }, 4000);

// Stateful component
class Alert extends TinyReact.Component {
  constructor(props) {
    super(props);
    this.state = {
      title: "Default title"
    };

    this.changeTitle = this.changeTitle.bind(this); // Binding the context to instance of Alert
  }

  changeTitle() {
    this.setState({ title: new Date().toString() });
  }

  render() {
    return (
      <div className="alert-container">
        <h2>{this.state.title}</h2>
        <div>
          {this.props.message}
        </div>
        <Button onClick={this.changeTitle}>Change title</Button>
      </div>
    );
  }
}

//TinyReact.render(<Alert message="Are you sure?" />, root);

// Diffing / Reconciliation of two stateful components

class Stateful extends TinyReact.Component {
  constructor(props) {
    super(props);
    console.log(props);
  }
  render() {
    return (
      <div>
        <h2>{this.props.title.toString()}</h2>
        <button onClick={update}>Update</button>
      </div>
    );
  }
}

//TinyReact.render(<Stateful title="Task 1" />, root);


function update() {
  TinyReact.render(<Stateful title={new Date()} />, root);
}


class WishList extends TinyReact.Component {
  constructor(props) {
    super(props);
    this.state = {
      wish: {
        title: "I wan't to be a programmer"
      }
    }
    this.update = this.update.bind(this);
  }

  update() {
    let newValue = this.inputWish.value;  // here inputWish is the input DOM element
    let wish = Object.assign({}, this.state.wish);
    // this.state.width = newValue;  // BAD PRACTICE as we are mutating the state

    wish.title = newValue;
    this.setState({
      wish
    });
  }

  render() {
    return (
      <div>
        <h2>Your wish list</h2>
        <input type="text" ref={(inputWish) => { this.inputWish = inputWish }} placeholder="What's your wish?"></input>
        <button onClick={this.update}>Update</button>

        <div>
          {this.state.wish.title}
        </div>
      </div>
    );
  }

}

//TinyReact.render(<WishList />, root);

let newElement = (
  <div>
    <p>One</p>
    <p>Two</p>
  </div>
);

//TinyReact.render(<WishList />, root);

// TinyReact.render(newElement, root);

// setTimeout(() => {
//   alert("Rerendering");
//   TinyReact.render(<WishList />, root);
//   //TinyReact.render(newElement, root);
// }, 4000);


//////******* TODO APP ***********/
let Header = props => {
  return (
    <div>
      <h1 style="color:green">{props.text}</h1>
      <h6>(double click on todo to mark as completed)</h6>
    </div>
  );
};


class TodoItem extends TinyReact.Component {
  constructor(props) {
    super(props);
    this.logging = true;
  }

  log(...args) {
    if (this.logging) {
      for (let i = 0; i < args.length; i++) {
        console.log(args[i]);
      }
    }
  }
  componentDidMount() {
    this.log("2. TodoItem:cdm");
  }
  componentWillMount() {
    this.log("1. TodoItem:cwm");
  }

  // VERY IMPORTANT
  shouldComponentUpdate(nextProps, nextState) {
    let result = nextProps.task != this.props.task;
    return result;
  }

  componentWillReceiveProps(nextProps) {
    this.log("TodoItem:cwrp: ", JSON.stringify(nextProps));
  }
  componentWillUnmount() {
    this.log("TodoItem:cwu: " + this.props.task.title);
  }

  handleEdit = task => {
    this.props.onUpdateTask(task.id, this.textInput.value);
  };

  editView = props => {
    if (props.task.edit) {
      return (
        <span>
          <input
            type="text"
            className="editItemInput"
            value={props.task.title}
            ref={input => (this.textInput = input)}
          />
          <button
            type="button"
            onClick={() => this.handleEdit(this.props.task)}
          >
            <i className="fas fa-save" />
          </button>
        </span>
      );
    }
    return props.task.title;
  };

  render() {
    let className = "todo-item ";
    if (this.props.task.completed) {
      className += "strike";
    }
    return (
      <li
        key={this.props.key}
        className={className}
        onDblClick={() => this.props.onToggleComplete(this.props.task)}
      >
        {this.editView(this.props)}
        <div className="todo-actions">
          <button
            type="button"
            onClick={() => this.props.onToggleEdit(this.props.task)}
          >
            <i className="fas fa-edit" />
          </button>
          <button
            type="button"
            className="btnDelete"
            onClick={() => this.props.onDelete(this.props.task)}
          >
            <i className="fas fa-trash" />
          </button>
        </div>
      </li>
    );
  }
}

class TodoApp extends TinyReact.Component {
  constructor(props) {
    super(props);
    this.addTodo = this.addTodo.bind(this);
    this.deleteTodo = this.deleteTodo.bind(this);
    this.onToggleEdit = this.onToggleEdit.bind(this);
    this.onUpdateTask = this.onUpdateTask.bind(this);
    this.onToggleComplete = this.onToggleComplete.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);

    this.state = {
      tasks: [{ id: 1, title: "Task 1", edit: false }],
      sortOrder: "asc"
    };
  }

  onKeyDown(e) {
    if (e.which === 13) {
      this.addTodo();
    }
  }
  deleteTodo(task) {
    var tasks = this.state.tasks.filter(t => {
      return t.id != task.id;
    });

    this.setState({
      header: "# Todos: " + tasks.length,
      tasks
    });
  }

  addTodo() {
    if (this.newTodo.value.trim() == "") {
      alert("You don't wanna do anything !");
      return;
    }
    let newTodo = {
      id: +new Date(),
      title: this.newTodo.value,
      edit: false
    };
    this.setState({
      tasks: [...this.state.tasks, newTodo]
    });

    this.newTodo.value = "";
    this.newTodo.focus();
  }

  sortToDo = () => {
    let tasks = null;
    let sortOrder = this.state.sortOrder;
    if (!sortOrder) {
      tasks = this.state.tasks.sort(
        (a, b) => +(a.title > b.title) || -(a.title < b.title)
      );
      sortOrder = "asc";
    } else if (sortOrder === "asc") {
      sortOrder = "desc";
      tasks = this.state.tasks.sort(
        (a, b) => +(b.title > a.title) || -(b.title < a.title)
      );
    } else {
      sortOrder = "asc";
      tasks = this.state.tasks.sort(
        (a, b) => +(a.title > b.title) || -(a.title < b.title)
      );
    }
    this.setState({
      tasks,
      sortOrder
    });
  };

  onUpdateTask(taskId, newTitle) {
    var tasks = this.state.tasks.map(t => {
      return t.id !== taskId ?
        t :
        Object.assign({}, t, { title: newTitle, edit: !t.edit });
    });

    this.setState({
      tasks
    });
  }

  // Uses setstate with fn argument
  onToggleEdit(task) {
    let tasks = this.state.tasks.map(t => {
      return t.id !== task.id ?
        t :
        Object.assign({}, t, { edit: !t.edit });
    });

    // DONT MUTATE STATE DIRECTLY
    // let tasks = this.state.tasks.map(t => {
    //   if (t.id === task.id) {
    //     t.edit = !t.edit;
    //   }
    //   return t;
    // });

    this.setState({
      tasks
    });
  }

  onToggleComplete(task) {
    let tasks = this.state.tasks.map(t => {
      return t.id !== task.id ?
        t :
        Object.assign({}, t, { completed: !t.completed });
    });

    this.setState({
      tasks
    });
  }

  render() {
    let tasksUI = this.state.tasks.map((task, index) => {
      return (
        <TodoItem
          key={task.id}
          task={task}
          index={index}
          onDelete={this.deleteTodo}
          onToggleEdit={this.onToggleEdit}
          onToggleComplete={this.onToggleComplete}
          onUpdateTask={this.onUpdateTask}
        />
      );
    });

    let sortIcon = <i className="fas fa-sort-alpha-down" />;
    if (this.state.sortOrder === "asc") {
      sortIcon = <i className="fas fa-sort-alpha-up" />;
    } else {
      sortIcon = <i className="fas fa-sort-alpha-down" />;
    }

    return (
      <div className="container">
        <Header text="Todo App (TinyReact)" />

        <div className="todo-input-container">
          <input
            type="text"
            className="addItemInput"
            onKeyDown={this.onKeyDown}
            ref={newTodo => (this.newTodo = newTodo)}
            placeholder="what do you want to do today?"
          />
          <button
            type="button"
            className="addItemButton"
            onClick={this.addTodo}
            value="Add Todo"
          >
            Add Todo
          </button>
          <button type="button" onClick={this.sortToDo} value="Sort">
            {sortIcon}
          </button>
        </div>
        <ul className="todos">{tasksUI}</ul>
      </div>
    );
  }
}

TinyReact.render(<TodoApp />, root);