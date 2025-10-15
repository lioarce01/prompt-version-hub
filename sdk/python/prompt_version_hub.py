"""
Minimal Python SDK for prompt-version-hub

Usage:
    from prompt_version_hub import Client
    c = Client(base_url="http://localhost:8000", token="...")
    c.create_prompt(name="welcome", template="Hello {{name}}", variables=["name"]) 
"""
from typing import Any, Dict, List, Optional
import requests


class Client:
    def __init__(self, base_url: str, token: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.token = token

    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def login(self, email: str, password: str) -> str:
        r = requests.post(f"{self.base_url}/auth/login", data={"username": email, "password": password})
        r.raise_for_status()
        tok = r.json()["access_token"]
        self.token = tok
        return tok

    def create_prompt(self, name: str, template: str, variables: List[str]):
        r = requests.post(f"{self.base_url}/prompts/", json={"name": name, "template": template, "variables": variables}, headers=self._headers())
        r.raise_for_status()
        return r.json()

    def update_prompt(self, name: str, template: str, variables: List[str]):
        r = requests.put(f"{self.base_url}/prompts/{name}", json={"template": template, "variables": variables}, headers=self._headers())
        r.raise_for_status()
        return r.json()

    def list_versions(self, name: str):
        r = requests.get(f"{self.base_url}/prompts/{name}/versions", headers=self._headers())
        r.raise_for_status()
        return r.json()

    def get_version(self, name: str, version: int):
        r = requests.get(f"{self.base_url}/prompts/{name}/versions/{version}", headers=self._headers())
        r.raise_for_status()
        return r.json()

    def rollback(self, name: str, version: int):
        r = requests.post(f"{self.base_url}/prompts/{name}/rollback/{version}", headers=self._headers())
        r.raise_for_status()
        return r.json()

    def diff(self, name: str, from_version: int, to_version: int):
        r = requests.get(f"{self.base_url}/prompts/{name}/diff", params={"from": from_version, "to": to_version}, headers=self._headers())
        r.raise_for_status()
        return r.json()

    def deploy(self, prompt_name: str, version: int, environment: str):
        r = requests.post(f"{self.base_url}/deployments/", json={"prompt_name": prompt_name, "version": version, "environment": environment}, headers=self._headers())
        r.raise_for_status()
        return r.json()

    def assign_variant(self, experiment: str, prompt_name: str, user_id: str):
        r = requests.post(f"{self.base_url}/ab/assign", json={"experiment_name": experiment, "prompt_name": prompt_name, "user_id": user_id})
        r.raise_for_status()
        return r.json()

    def record_usage(self, prompt_id: int, user_id: Optional[str], output: Optional[str], success: bool = True, latency_ms: Optional[int] = None, cost: Optional[int] = None):
        r = requests.post(f"{self.base_url}/usage/", json={"prompt_id": prompt_id, "user_id": user_id, "output": output, "success": success, "latency_ms": latency_ms, "cost": cost})
        r.raise_for_status()
        return r.json()

