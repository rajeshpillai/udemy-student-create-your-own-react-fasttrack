import TinyReact from "./tiny-react";

// Module 9: Keyed reconciliation — items reorder instead of being recreated

const root = document.getElementById("root");

const items1 = [
  { id: 1, text: "Apple" },
  { id: 2, text: "Banana" },
  { id: 3, text: "Cherry" },
  { id: 4, text: "Date" },
];

const items2 = [
  { id: 3, text: "Cherry" },
  { id: 1, text: "Apple" },
  { id: 4, text: "Date" },
  // id: 2 (Banana) is removed
];

function renderList(items) {
  return (
    <div>
      <h1>Keyed List Demo</h1>
      <p>Items will reorder and one will be removed in 5 seconds.</p>
      <ul>
        {items.map((item) => (
          <li key={item.id} style={{ padding: "8px", borderBottom: "1px solid #ccc" }}>
            {item.id}: {item.text}
            <input type="text" placeholder={"Type in " + item.text} />
          </li>
        ))}
      </ul>
    </div>
  );
}

TinyReact.render(renderList(items1), root);

setTimeout(() => {
  alert(
    "Re-rendering with reordered list. Type something in the inputs first!\n" +
    "With keys: inputs follow their items.\nWithout keys: inputs would stay in position."
  );
  TinyReact.render(renderList(items2), root);
}, 5000);
