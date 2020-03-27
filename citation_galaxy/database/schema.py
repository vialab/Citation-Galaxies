from citation_galaxy.settings import CODE_DIR
api = {
    "signal": {
        "query": "-- name: signal\nselect id, signalcategoryid, name, signal from signal \
      where cookieid=:cookieid;",
        "require_cookie": True,
        # "aliases": {
        #     # "signalcategoryid": {"query": "signalcategory", "value": "id", "col": "catname", "name": "category"},
        #     # "signaltypeid": {"query": "signaltype", "value": "id", "col": "name", "name": "type"},
        #     # "parentid": {"query": "signal", "value": "id", "col": "signal", "name": "Parent Signal"},
        #     # "signal": {"name": "Signal", "nameonly": True}
        # },
        # "links": {
        #     # to be used to connect to other queries
        #     # "filters": {
        #     #     "params": {"id": "parentid"},  # potential parameters to pass into next query
        #     #     "query": "filter",  # name of another query
        #     # },
        #     # "restrictions": {"params": {"id": "parentid"}, "query": "restriction"},
        # },
        # "actions": {
        #     # to be used to perform specific javascript functions
        #     "similar": "findSimilar"  # let's let javascript handle getting the params
        # },
        "origin": "signal",
    },
    "signalbycategory": {
        "query": "-- name: signal_by_category\nselect id, signalcategoryid, name, signal from signal \
      where signalcategoryid=:signalcategoryid and cookieid=:cookieid;",
    #     "query": "-- name: signal_by_category\nselect id, signal, parentid from signal \
    #   where enabled and signaltypeid=1 and signalcategoryid=:signalcategoryid and cookieid=:cookieid;",
        "require_cookie": True,
        # "aliases": {
        #     "signalcategoryid": {"query": "signalcategory", "value": "id", "col": "catname", "name": "category"},
        #     # "signaltypeid": {"query": "signaltype", "value": "id", "col": "name", "name": "type"},
        #     # "parentid": {"query": "signal", "value": "id", "col": "signal", "name": "parent"},
        # },
        # "links": {
        #     # to be used to connect to other queries
        #     "filters": {
        #         "params": {"id": "parentid"},  # potential parameters to pass into next query
        #         "query": "filter",  # name of another query
        #     },
        #     "restrictions": {"params": {"id": "parentid"}, "query": "restriction"},
        # },
        # "actions": {
        #     # to be used to perform specific javascript functions
        #     "similar": "findSimilar"  # let's let javascript handle getting the params
        # },
        "origin": "signal",
        "parent": "signalcategoryid",
    },
    "signalbytype": {
        "query": "-- name: signal_by_type\nselect id, signalcategoryid, signal,  from signal \
      where id=:signaltypeid and cookieid=:cookieid;",
        "require_cookie": True,
        # "aliases": {
        #     "signalcategoryid": {"query": "signalcategory", "value": "id", "col": "catname", "name": "category"},
        #     # "signaltypeid": {"query": "signaltype", "value": "id", "col": "name", "name": "type"},
        #     # "parentid": {"query": "signal", "value": "id", "col": "signal", "name": "parent"},
        # },
        # "links": {
        #     # to be used to connect to other queries
        #     "filters": {
        #         "params": {"id": "parentid"},  # potential parameters to pass into next query
        #         "query": "filter",  # name of another query
        #     },
        #     "restrictions": {"params": {"id": "parentid"}, "query": "restriction"},
        # # },
        # "actions": {
        #     # to be used to perform specific javascript functions
        #     "similar": "findSimilar"  # let's let javascript handle getting the params
        # },
        "origin": "signal",
        # "parent": "signaltypeid",
    },
    # "filter": {
    #     "query": "-- name: filter\nselect id, signalcategoryid, signal, distance, parentid, signaltypeid from signal \
    #   where enabled and signaltypeid=2 and parentid=:parentid and cookieid=:cookieid",
    #     "require_cookie": True,
    #     "aliases": {
    #         "signalcategoryid": {"query": "signalcategory", "value": "id", "col": "catname", "name": "category"},
    #         "signaltypeid": {"query": "signaltype", "value": "id", "col": "name", "name": "type"},
    #         "parentid": {"query": "signal", "value": "id", "col": "signal", "name": "parent"},
    #     },
    #     "links": {
    #         # to be used to connect to other queries
    #         "filters": {
    #             "params": {"id": "parentid"},  # potential parameters to pass into next query
    #             "query": "filter",  # name of another query
    #         },
    #         "restrictions": {"params": {"id": "parentid"}, "query": "restriction"},
    #     },
    #     "actions": {
    #         # to be used to perform specific javascript functions
    #         "similar": "findSimilar"  # let's let javascript handle getting the params
    #     },
    #     "origin": "signal",
    #     "parent": "parentid",
    # },
    # "restriction": {
    #     "query": "-- name: restriction\nselect id, signalcategoryid, signal, distance, parentid, signaltypeid from signal \
    #   where enabled and signaltypeid=3 and parentid=:parentid and cookieid=:cookieid",
    #     "require_cookie": True,
    #     "aliases": {
    #         "signalcategoryid": {"query": "signalcategory", "value": "id", "col": "catname", "name": "category"},
    #         "signaltypeid": {"query": "signaltype", "value": "id", "col": "name", "name": "type"},
    #         "parentid": {"query": "signal", "value": "id", "col": "signal", "name": "parent"},
    #     },
    #     "links": {
    #         # to be used to connect to other queries
    #         "filters": {
    #             "params": {"id": "parentid"},  # potential parameters to pass into next query
    #             "query": "filter",  # name of another query
    #         },
    #         "restrictions": {"params": {"id": "parentid"}, "query": "restriction"},
    #     },
    #     "actions": {
    #         # to be used to perform specific javascript functions
    #         "similar": "findSimilar"  # let's let javascript handle getting the params
    #     },
    #     "origin": "signal",
    #     "parent": "parentid",
    # },
    "signalcategory": {
        "query": "-- name: signal_category\nselect id, catname, color from signalcategory where cookieid=:cookieid order by id;",
        "require_cookie": True,
        "aliases": {
            "catname":{"name": "Category Name", "nameonly": True},
            "color":{"name": "Color", "nameonly": True},
            # "catname":{"name": "Category Name", "nameonly": True}
            # "catname": {"query": "signalcategory", "value": "catname", "col": "catname", "name": "Category Name"},
        },
        "links": {"signals": {"params": {"id": "signalcategoryid"}, "query": "signalbycategory"}},
        "origin": "signalcategory",
    },
    "signaltypee": {
        "query": "-- name: signal_type\nselect id, name, type from signaltype",
        "aliases": {},
        "require_cookie": False,
        "origin": "signaltype",
    },
    "insert_signal": {
        "query": "-- name: insert_signal<!\ninsert into signal(signalcategoryid, name, cookieid, signal) \
      values( :signalcategoryid, :name, :cookieid, :signal )",
        "require_cookie": True,
    },
    "update_signal": {
        "query": "-- name: update_signal!\nupdate signal set name=case when :name::varchar is not null then :name else name end, signal=case when :signal::json is not null then :signal else signal end, \
      signalcategoryid=case when :signalcategoryid::int is not null then :signalcategoryid else signalcategoryid end, cookieid= case when :cookieid::varchar is not null then :cookieid else cookieid end where id=:id and cookieid=:cookieid",
        "require_cookie": True,
        "aliases": {},
    },
    "delete_signal": {
        "query": "-- name: delete_signal!\ndelete from signal where id=:id and cookieid=:cookieid",
        "require_cookie": True,
        "aliases": {},
    },
    "insert_signalcategory": {
        "query": "-- name: insert_signal_category<!\ninsert into signalcategory(catname, color, cookieid) \
      values(:catname, :color, :cookieid);",
        "require_cookie": True,
        "aliases": {},
    },
    "update_signalcategory": {
        "query": "-- name: update_signal_category!\nupdate signalcategory set catname=case when :catname is not null then :catname else catname end, \
      color=case when :color is not null then :color else color end where id=:id and cookieid=:cookieid ;",
        "require_cookie": True,
        "aliases": {},
    },
    "delete_signalcategory": {
        "query": "-- name: delete_signal_category!\ndelete from signalcategory where id=:id and cookieid=:cookieid ;",
        "require_cookie": True,
        "aliases": {},
    },
}

import json
with (CODE_DIR / 'database/dbschema.json').open('r') as fp:
    schema = json.load(fp)