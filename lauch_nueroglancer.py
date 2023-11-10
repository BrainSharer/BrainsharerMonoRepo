import click
from git import Repo
import subprocess
from sys import exit
import tempfile
from pathlib import Path
import os
from shutil import copyfile
import json


GITHUB_URL= "https://github.com/BrainSharer/BrainsharerMonoRepo.git"
GOOD_FIREBASE_FILE_PATH= Path("/home/yusup/BrainsharerMonoRepo/neuroglancer/src/neuroglancer/services/firebase.ts")
FIREBASE_FILE_PATH= Path("neuroglancer/src/neuroglancer/services/firebase.ts")
ALL_BUILD_FILES_PATH="neuroglancer/dist/min"

@click.command()
@click.argument('publish_to')
def launch_neuoglacner(publish_to):
    with tempfile.TemporaryDirectory() as tmpdirname:
        if not os.path.isabs(publish_to):
            print('not absolute path')
            exit(1)
        print(tmpdirname)
        repo = Repo.clone_from(GITHUB_URL, tmpdirname)
        for remote in repo.remotes:
            remote.fetch()
        repo.git.checkout('origin/main')

        subprocess.run(["cp", str(GOOD_FIREBASE_FILE_PATH), str(Path(tmpdirname)/ FIREBASE_FILE_PATH)], cwd=tmpdirname)
        subprocess.run(["npm", "install"], cwd=str(Path(tmpdirname) / "neuroglancer"))
        subprocess.run(["npm", "run", "build-prod"], cwd=str(Path(tmpdirname) / "neuroglancer"))
        subprocess.run(["mkdir", "-p", publish_to]) 
        build_file_names = os.listdir(path=Path(tmpdirname)/ ALL_BUILD_FILES_PATH)
        build_file_paths = [Path(tmpdirname)/ ALL_BUILD_FILES_PATH / build_file_name for build_file_name in build_file_names]
        for build_file_path in build_file_paths:
            subprocess.run(["cp", str(build_file_path), publish_to]) 

        version_info = {}
        version_info["commit"] = repo.head.object.hexsha

        with open(str(Path(publish_to) / "version_info.json"), "w") as outfile:
            json.dump(version_info, outfile, indent=4)

if __name__ == "__main__":
    launch_neuoglacner()