# settings.py
import argparse
import pathlib

from trafaret_config import commandline

from citation_galaxy.utils import TRAFARET

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
CONF_DIR = BASE_DIR / "config"
DEFAULT_CONFIG_PATH = CONF_DIR / "citationdb.yaml"


def get_config(argv=None):
    ap = argparse.ArgumentParser()
    commandline.standard_argparse_options(ap, default_config=DEFAULT_CONFIG_PATH)

    # ignore unknown options
    options, _unknown = ap.parse_known_args(argv)

    config = commandline.config_from_options(options, TRAFARET)

    return config


config = get_config()


