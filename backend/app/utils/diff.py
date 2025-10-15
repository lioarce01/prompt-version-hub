import difflib


def unified_diff_text(a: str, b: str, from_label: str = "from", to_label: str = "to") -> str:
    a_lines = a.splitlines(keepends=True)
    b_lines = b.splitlines(keepends=True)
    diff = difflib.unified_diff(a_lines, b_lines, fromfile=from_label, tofile=to_label)
    return "".join(diff)

