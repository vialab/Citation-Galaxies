import logging
import sys

import aiohttp_jinja2
import asyncpg
import jinja2
import uvloop
from aiohttp import web

# from citation_galaxy.db import close_pg, init_pg
from citation_galaxy.middlewares import setup_middlewares
from citation_galaxy.routes import setup_routes
from citation_galaxy.settings import get_config

uvloop.install()
# asyncio.set_event_loop_policy(uvloop.get_event_loop_policy())


async def init_app(argv=None):
    app = web.Application()

    app["config"] = get_config(argv)

    print(app["config"]["postgres"])

    app["db"] = await asyncpg.create_pool(**app["config"]["postgres"])

    # setup Jinja2 template renderer
    aiohttp_jinja2.setup(app, loader=jinja2.PackageLoader("citation_galaxy", "templates"))

    # create db connection on startup, shutdown on exit
    # app.on_startup.append(init_pg)
    # app.on_cleanup.append(close_pg)

    # setup views and routes
    setup_routes(app)

    setup_middlewares(app)

    return app


def main(argv):
    logging.basicConfig(level=logging.DEBUG)

    app = init_app(argv)

    config = get_config(argv)
    web.run_app(app, host=config["host"], port=config["port"])


if __name__ == "__main__":
    main(sys.argv[1:])
