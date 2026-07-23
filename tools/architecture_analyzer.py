import ast
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

SQL_AGENT = PROJECT_ROOT / "agents" / "sql_agent.py"

def load_tree():

    with open(SQL_AGENT, "r", encoding="utf-8") as f:
        source = f.read()

    return ast.parse(source)

tree = load_tree()

print("FUNCTIONS FOUND:\n")
IGNORE = {
    "print","time","round","list","set","max","str","len",
    "join","append","pop","keys","get","add","strip","to_dict"
}

tree = load_tree()

for node in tree.body:

    if isinstance(node, ast.FunctionDef) and node.name == "run_sql_agent":

        print("\nFUNCTION INPUTS & OUTPUTS\n")

        for stmt in ast.walk(node):

            if isinstance(stmt, ast.Assign):

                if isinstance(stmt.value, ast.Call):

                    func_name = None

                    if isinstance(stmt.value.func, ast.Name):
                        func_name = stmt.value.func.id

                    elif isinstance(stmt.value.func, ast.Attribute):
                        func_name = stmt.value.func.attr

                    if func_name and func_name not in IGNORE:

                        outputs = []

                        for t in stmt.targets:
                            if isinstance(t, ast.Name):
                                outputs.append(t.id)

                        inputs = []

                        for arg in stmt.value.args:

                            if isinstance(arg, ast.Name):
                                inputs.append(arg.id)

                            else:
                                inputs.append(ast.unparse(arg))

                        # Keyword arguments
                        for kw in stmt.value.keywords:

                            if kw.arg is not None:
                                inputs.append(f"{kw.arg}={ast.unparse(kw.value)}")

                        print(f"{func_name}")
                        print(f"    INPUTS : {inputs}")
                        print(f"    OUTPUTS: {outputs}\n")