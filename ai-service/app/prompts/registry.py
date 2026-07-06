from dataclasses import dataclass
from typing import Callable


@dataclass
class PromptTemplate:
    name: str
    version: str
    render: Callable[..., str]


class PromptRegistry:
    def __init__(self) -> None:
        self._templates: dict[str, PromptTemplate] = {}

    def register(self, template: PromptTemplate) -> None:
        key = f"{template.name}@{template.version}"
        self._templates[key] = template

    def get(self, name: str, version: str) -> PromptTemplate:
        key = f"{name}@{version}"
        if key not in self._templates:
            raise KeyError(f"No prompt template registered for {key}")
        return self._templates[key]

    def latest(self, name: str) -> PromptTemplate:
        matches = [t for k, t in self._templates.items() if k.startswith(f"{name}@")]
        if not matches:
            raise KeyError(f"No prompt template registered for '{name}'")
        return sorted(matches, key=lambda t: t.version)[-1]


_registry = PromptRegistry()


def get_registry() -> PromptRegistry:
    return _registry
