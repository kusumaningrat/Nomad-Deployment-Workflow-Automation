import shutil
import subprocess
import tempfile
from pathlib import Path

def run(cmd, cwd=None):
    result = subprocess.run(
        cmd,
        cwd=cwd,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    return result.stdout

def push_to_github(
        repo_url: str,
        branch: str,
        target_path: str,
        content: str,
        commit_message
):
    
    temp_dir = tempfile.mkdtemp(prefix="gitops")

    try:
        repo_path = Path(temp_dir) / "repo"

        # Clone
        run([
            "git", "clone",
            "--depth", "1",
            "--branch", branch,
            repo_url,
            repo_path.as_posix()
        ])


        # 2 Write File
        file_path = repo_path / target_path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content)

        # 3 Git identity
        run(["git", "config", "user.name", "devops-glynac"], cwd=repo_path)
        run(["git", "config", "user.email", "devops@glynac.ai"], cwd=repo_path)

        # 4 Commit & push
        run(["git", "add", target_path], cwd=repo_path)

        # Avoid empty commit
        status = run(["git", "status", "--porcelain"], cwd=repo_path)
        if not status.strip():
            return {"message": "No changes detected, nothing to push"}

        run(
            ["git", "commit", "-m", commit_message],
            cwd=repo_path
        )
        run(["git", "push", "origin", branch], cwd=repo_path)

        return {"message": "Nomad job pushed successfully"}

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)