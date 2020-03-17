from citation_galaxy.settings import CODE_DIR
api = {
    "signal": {
        "query": "-- name: signal\nselect id, signalcategoryid, signal, score, distance, parentid, signaltypeid from signal \
      where enabled and cookieid=:cookieid;",
        "require_cookie": True,
        "aliases": {
            "signalcategoryid": {"query": "signalcategory", "value": "id", "col": "catname", "name": "category"},
            "signaltypeid": {"query": "signaltype", "value": "id", "col": "name", "name": "type"},
            "parentid": {"query": "signal", "value": "id", "col": "signal", "name": "parent"},
        },
        "links": {
            # to be used to connect to other queries
            "filters": {
                "params": {"id": "parentid"},  # potential parameters to pass into next query
                "query": "filter",  # name of another query
            },
            "restrictions": {"params": {"id": "parentid"}, "query": "restriction"},
        },
        "actions": {
            # to be used to perform specific javascript functions
            "similar": "findSimilar"  # let's let javascript handle getting the params
        },
        "origin": "signal",
    },
    "signalbycategory": {
        "query": "-- name: signal_by_category\nselect id, signalcategoryid, signal, score, distance, parentid, signaltypeid from signal \
      where enabled and signaltypeid=1 and signalcategoryid=:signalcategoryid and cookieid=:cookieid;",
        "require_cookie": True,
        "aliases": {
            "signalcategoryid": {"query": "signalcategory", "value": "id", "col": "catname", "name": "category"},
            "signaltypeid": {"query": "signaltype", "value": "id", "col": "name", "name": "type"},
            "parentid": {"query": "signal", "value": "id", "col": "signal", "name": "parent"},
        },
        "links": {
            # to be used to connect to other queries
            "filters": {
                "params": {"id": "parentid"},  # potential parameters to pass into next query
                "query": "filter",  # name of another query
            },
            "restrictions": {"params": {"id": "parentid"}, "query": "restriction"},
        },
        "actions": {
            # to be used to perform specific javascript functions
            "similar": "findSimilar"  # let's let javascript handle getting the params
        },
        "origin": "signal",
        "parent": "signalcategoryid",
    },
    "signalbytype": {
        "query": "-- name: signal_by_type\nselect id, signalcategoryid, signal, score, distance, parentid, signaltypeid from signal \
      where enabled and signaltypeid=:signaltypeid and cookieid=:cookieid;",
        "require_cookie": True,
        "aliases": {
            "signalcategoryid": {"query": "signalcategory", "value": "id", "col": "catname", "name": "category"},
            "signaltypeid": {"query": "signaltype", "value": "id", "col": "name", "name": "type"},
            "parentid": {"query": "signal", "value": "id", "col": "signal", "name": "parent"},
        },
        "links": {
            # to be used to connect to other queries
            "filters": {
                "params": {"id": "parentid"},  # potential parameters to pass into next query
                "query": "filter",  # name of another query
            },
            "restrictions": {"params": {"id": "parentid"}, "query": "restriction"},
        },
        "actions": {
            # to be used to perform specific javascript functions
            "similar": "findSimilar"  # let's let javascript handle getting the params
        },
        "origin": "signal",
        "parent": "signaltypeid",
    },
    "filter": {
        "query": "-- name: filter\nselect id, signalcategoryid, signal, distance, parentid, signaltypeid from signal \
      where enabled and signaltypeid=2 and parentid=:parentid and cookieid=:cookieid",
        "require_cookie": True,
        "aliases": {
            "signalcategoryid": {"query": "signalcategory", "value": "id", "col": "catname", "name": "category"},
            "signaltypeid": {"query": "signaltype", "value": "id", "col": "name", "name": "type"},
            "parentid": {"query": "signal", "value": "id", "col": "signal", "name": "parent"},
        },
        "links": {
            # to be used to connect to other queries
            "filters": {
                "params": {"id": "parentid"},  # potential parameters to pass into next query
                "query": "filter",  # name of another query
            },
            "restrictions": {"params": {"id": "parentid"}, "query": "restriction"},
        },
        "actions": {
            # to be used to perform specific javascript functions
            "similar": "findSimilar"  # let's let javascript handle getting the params
        },
        "origin": "signal",
        "parent": "parentid",
    },
    "restriction": {
        "query": "-- name: restriction\nselect id, signalcategoryid, signal, distance, parentid, signaltypeid from signal \
      where enabled and signaltypeid=3 and parentid=:parentid and cookieid=:cookieid",
        "require_cookie": True,
        "aliases": {
            "signalcategoryid": {"query": "signalcategory", "value": "id", "col": "catname", "name": "category"},
            "signaltypeid": {"query": "signaltype", "value": "id", "col": "name", "name": "type"},
            "parentid": {"query": "signal", "value": "id", "col": "signal", "name": "parent"},
        },
        "links": {
            # to be used to connect to other queries
            "filters": {
                "params": {"id": "parentid"},  # potential parameters to pass into next query
                "query": "filter",  # name of another query
            },
            "restrictions": {"params": {"id": "parentid"}, "query": "restriction"},
        },
        "actions": {
            # to be used to perform specific javascript functions
            "similar": "findSimilar"  # let's let javascript handle getting the params
        },
        "origin": "signal",
        "parent": "parentid",
    },
    "signalcategory": {
        "query": "-- name: signal_category\nselect id, catname, score, color from signalcategory where enabled\
      and cookieid=:cookieid;",
        "require_cookie": True,
        "aliases": {},
        "links": {"signals": {"params": {"id": "signalcategoryid"}, "query": "signalbycategory"}},
        "origin": "signalcategory",
    },
    "signaltype": {
        "query": "-- name: signal_type\nselect id, name, type from signaltype",
        "aliases": {},
        "require_cookie": False,
        "origin": "signaltype",
    },
    "insert_signal": {
        "query": "-- name: insert_signal\ninsert into signal(signal, score, signalcategoryid, enabled, cookieid, signaltypeid, parentid) \
      values(:signal, :score, :signalcategoryid, True, :cookieid, :signaltypeid, :parentid)",
        "require_cookie": True,
    },
    "update_signal": {
        "query": "-- name: update_signal\nupdate signal set signal=:signal, score=:score, \
      signalcategoryid=:signalcategoryid, cookieid=:cookieid, \
      signaltypeid=:signaltypeid where id=:id and cookieid=:cookieid",
        "require_cookie": True,
        "aliases": {},
    },
    "delete_signal": {
        "query": "-- name: delete_signal\ndelete from signal where id=:id and cookieid=:cookieid",
        "require_cookie": True,
        "aliases": {},
    },
    "insert_signalcategory": {
        "query": "-- name: insert_signal_category\ninsert into signalcategory(catname, score, color, enabled, cookieid) \
      values(:catname, :score, :color, True, :cookieid)",
        "require_cookie": True,
        "aliases": {},
    },
    "update_signalcategory": {
        "query": "-- name: update_signal_category\nupdate signalcategory set catname=:catname, score=:score, \
      color=:color where id=:id and cookieid=:cookieid",
        "require_cookie": True,
        "aliases": {},
    },
    "delete_signalcategory": {
        "query": "-- name: delete_signal_category\ndelete from signalcategory where id=:id and cookieid=:cookieid",
        "require_cookie": True,
        "aliases": {},
    },
}

import json
with (CODE_DIR / 'database/dbschema.json').open('r') as fp:
    schema = json.load(fp)