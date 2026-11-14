# -*- coding: utf-8 -*-
import pythoncom
import win32com.client as w

app = w.DispatchEx("Visio.Application")
doc = app.Documents.Add("")
pg = doc.Pages.Item(1)
pts = [(10.0, 10.0), (10.0, 50.0), (60.0, 50.0)]

tries = {
    "VARIANT flat R8": lambda: w.VARIANT(pythoncom.VT_ARRAY | pythoncom.VT_R8,
                                         [10.0, 10.0, 10.0, 50.0, 60.0, 50.0]),
    "tuple flat": lambda: tuple([10.0, 10.0, 10.0, 50.0, 60.0, 50.0]),
    "list of tuples": lambda: [(10.0, 10.0), (10.0, 50.0), (60.0, 50.0)],
    "nested flat": lambda: [[10.0, 10.0], [10.0, 50.0], [60.0, 50.0]],
    "VARIANT VT_VARIANT": lambda: w.VARIANT(pythoncom.VT_ARRAY | pythoncom.VT_VARIANT,
                                            [10.0, 10.0, 10.0, 50.0, 60.0, 50.0]),
}
for k, fn in tries.items():
    try:
        s = pg.DrawPolyline(1, fn())
        print(k, "OK", s.CellsU("Width").ResultIU, s.CellsU("Height").ResultIU)
    except Exception as e:
        print(k, "ERR", e)
doc.Close()
