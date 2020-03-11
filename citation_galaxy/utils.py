# utils.py
import trafaret as T

TRAFARET = T.Dict(
    {
        T.Key("postgres"): T.Dict(
            {
                "database": T.String(),
                "user": T.String(),
                "password": T.String(),
                "host": T.String(),
                "port": T.Int(),
                "min_size": T.Int(),
                "max_size": T.Int(),
            }
        ),
        T.Key("host"): T.IP,
        T.Key("port"): T.Int(),
        T.Key("year_range"): T.Dict({"min": T.Int(), "max": T.Int()}),
    }
)
