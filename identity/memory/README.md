# What is in this folder

A map of the files, for anyone reading the repository. It is not instructions:
what to keep and what to let go is in `remembering.md` in the utility
repository, which the engine gives the agent at sleep, when those decisions are
actually made.

```
short-term/episodic.md            things kept during the day, by `remember`.
                                  Sleep reads it and empties it.

long-term/core-episodic.md        the index: each memory's title, its rank,
long-term/relationships.md        and its id. This is what loads every session.
long-term/semantic.md
long-term/procedural.md           rules written for itself. Carried in full and
                                  never ranked.

long-term/<category>/<id>.md      one file per memory, holding the whole of it.
                                  Not loaded; read by asking for it by id.

.salience.json                    what the engine loads. The markdown is
                                  authoritative — sleep reads it back before
                                  writing, so an edit made by hand survives.
```

An index entry marked _More of this in full_ has been shortened, and the rest
of it is in that memory's own file.

Things the agent has let go are not here. They go to `private_memory/forgotten/`
in the private repository, with the reason, where the operator can read them and
the agent cannot.
