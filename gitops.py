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

def push_nomad_job_to_github(
        repo_url: str,
        branch: str,
        job_name: str,
        hcl_content: str
):
    
    temp_dir = tempfile.mkdtemp(prefix="nomad-git-")

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

        jobs_dir = repo_path / "nomad"
        jobs_dir.mkdir(exist_ok=True)

        job_file = jobs_dir / f"{job_name}.hcl"

        # 2 Write HCL
        job_file.write_text(hcl_content)

        # 3 Git identity
        run(["git", "config", "user.name", "gitops-bot"], cwd=repo_path)
        run(["git", "config", "user.email", "gitops@glynac.ai"], cwd=repo_path)

        # 4 Commit & push
        run(["git", "add", job_file.name], cwd=jobs_dir)

        # Avoid empty commit
        status = run(["git", "status", "--porcelain"], cwd=repo_path)
        if not status.strip():
            return {"message": "No changes detected, nothing to push"}

        run(
            ["git", "commit", "-m", f"feat(deployment): Add/Update Nomad job for {job_name}"],
            cwd=repo_path
        )
        run(["git", "push", "origin", branch], cwd=repo_path)

        return {"message": "Nomad job pushed successfully"}

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)