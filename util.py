def resolve_repo_url(job_name: str, repo_map: dict) -> str | None:
    job_name_lower = job_name.lower()

    for key, repo_url in repo_map.items():
        if key.lower() in job_name_lower:
            return repo_url
        
    return None