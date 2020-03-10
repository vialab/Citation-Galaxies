""" Asyncpg Record proxy
    - This file creates a simple record proxy object for the asyncpg records.
    In other words, these records behave the same way asyncpg records do, allowing us to pickle them
"""
import copyreg

import asyncpg


class asyncpgRecordProxy(object):
    def __init__(self, data):
        self._data = data
        self._keymap = {}

        for (key, value) in self._data:
            self._keymap[key] = value

    def items(self):
        return self._data

    def values(self):
        for (_key, value) in self._data:
            yield value

    def keys(self):
        for (key, _value) in self._data:
            yield key

    def get(self, key, default=None):
        return self._keymap.get(key, default)

    def __getitem__(self, key):
        if isinstance(key, str):
            return self.__getattribute__(key)
        else:
            return self._data[key][1]

    def __getattribute__(self, key):
        if object.__getattribute__(self, "_keymap").get(key, None) is not None:
            return object.__getattribute__(self, "_keymap")[key]
        else:
            return object.__getattribute__(self, key)

    def __repr__(self):
        return (
            "<Record "
            + " ".join((f"{key}={value}" for (key, value) in self._data))
            + ">"
        )


def pickle_asyncpgRecord(rec):
    return (asyncpgRecordProxy, (list(rec.items()),))


copyreg.pickle(asyncpg.Record, pickle_asyncpgRecord)
