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


def list_in_string( list_of_words, string_containing ):
    return any( ( True for searchword in list_of_words if searchword in string_containing ) )