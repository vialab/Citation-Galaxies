#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""Module documentation goes here
   and here
   and ...
"""

# import argparse
import pathlib

import yaml

# from trafaret_config import commandline

# from citation_galaxy.utils import TRAFARET

HERE     = pathlib.Path(__file__).resolve()
BASE_DIR = HERE.parent.parent
CODE_DIR = HERE.parent
CONF_DIR = BASE_DIR / "config"
DEFAULT_CONFIG_PATH = CONF_DIR / "citationdb.yaml"

namespace = globals()


# def get_config(argv=None):
#     ap = argparse.ArgumentParser()
#     commandline.standard_argparse_options(ap, default_config=DEFAULT_CONFIG_PATH)

#     # ignore unknown options
#     options, _unknown = ap.parse_known_args(argv)

#     config = commandline.config_from_options(options, TRAFARET)

#     return config


# config = get_config()



class Map(dict):
    """
    Example:
    m = Map({'first_name': 'Eduardo'}, last_name='Pool', age=24, sports=['Soccer'])
    """
    def __init__(self, *args, **kwargs):
        super(Map, self).__init__(*args, **kwargs)
        for arg in args:
            if isinstance(arg, dict):
                for k, v in arg.items():
                    if isinstance(v, dict):
                        self[k] = Map(v)
                    else:
                        self[k] = v

        if kwargs:
            for k, v in kwargs.items():
                if isinstance(v, dict):
                    self[k] = Map(v)
                else:
                    self[k] = v

    def __getattr__(self, attr):
        return self.get(attr)

    def __setattr__(self, key, value):
        self.__setitem__(key, value)

    def __setitem__(self, key, value):
        super(Map, self).__setitem__(key, value)
        self.__dict__.update({key: value})

    def __delattr__(self, item):
        self.__delitem__(item)

    def __delitem__(self, key):
        super(Map, self).__delitem__(key)
        del self.__dict__[key]


def load_config():
    with DEFAULT_CONFIG_PATH.open('r') as fp:
        conf = yaml.load( fp, Loader=yaml.FullLoader )

        for doc in conf:
            if isinstance(conf[doc],dict):
                namespace[ doc ] = Map(conf[doc])
            else: 
                namespace[ doc ] = conf[doc]

    return conf

config = load_config()

del namespace
# print('done')