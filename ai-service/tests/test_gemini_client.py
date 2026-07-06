import pytest

from app.llm.json_utils import extract_json


def test_extract_json_plain():
    assert extract_json('{"a": 1}') == {"a": 1}


def test_extract_json_with_markdown_fences():
    text = '```json\n{"a": 1, "b": [1, 2]}\n```'
    assert extract_json(text) == {"a": 1, "b": [1, 2]}


def test_extract_json_with_leading_junk():
    text = 'Sure, here is the JSON:\n{"a": 1}'
    assert extract_json(text) == {"a": 1}


def test_extract_json_with_trailing_junk():
    text = '{"a": 1}\nLet me know if you need anything else!'
    assert extract_json(text) == {"a": 1}


def test_extract_json_recovers_truncated_object():
    text = '{"a": 1, "b": {"c": 2'
    assert extract_json(text) == {"a": 1, "b": {"c": 2}}


def test_extract_json_recovers_truncated_array():
    text = '{"items": [1, 2, 3'
    assert extract_json(text) == {"items": [1, 2, 3]}


def test_extract_json_raises_on_unrecoverable_garbage():
    with pytest.raises(Exception):
        extract_json("not json at all, no braces")
