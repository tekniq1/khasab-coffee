function CategoriesModule({ products }: { products: Product[] }) {
  const { categories, tableMissing, reload } = useLiveCategories({ includeHidden: true });
  const [editing, setEditing] = useState<Category | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ id: "", name: "", image: "", is_active: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = () => (supabase as any).from("categories");
  const countIn = (id: string) => products.filter((p) => p.category === id).length;

  const openAdd = () => {
    setEditing(null);
    setForm({ id: "", name: "", image: "", is_active: true });
    setFormOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ id: c.id, name: c.name, image: c.image || "", is_active: c.is_active });
    setFormOpen(true);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `categories/cat-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setForm((f) => ({ ...f, image: data.publicUrl }));
      toast.success("+¬+à +¦+ü+¦ +¦+ê+¦+¬ +º+ä+é+¦+à");
    } catch (e) {
      console.error(e);
      toast.error("+¬+¦+¦+¦ +¦+ü+¦ +º+ä+¦+ê+¦+¬");
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.error("+º+â+¬+¿ +º+¦+à +º+ä+é+¦+à");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await db()
          .update({ name, image: form.image || null, is_active: form.is_active })
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("+¬+à +¬+¡+»+è+½ +º+ä+é+¦+à");
      } else {
        const id = makeCategoryId(form.id || name);
        if (categories.some((c) => c.id === id)) {
          toast.error("+º+ä+à+¦+¦+æ+ü +à+¦+¬+«+»+à +ä+é+¦+à +ó+«+¦+î +º+«+¬+¦ +à+¦+¦+æ+ü+º+ï +à+«+¬+ä+ü+º+ï");
          return; // finally{} resets saving
        }
        const maxOrder = categories.reduce((m, c) => Math.max(m, c.sort_order), 0);
        const { error } = await db().insert({
          id,
          name,
          image: form.image || null,
          is_active: form.is_active,
          sort_order: maxOrder + 1,
        });
        if (error) throw error;
        toast.success("+¬+à+¬ +Ñ+¦+º+ü+¬ +º+ä+é+¦+à GÇö +ú+¦+ü +ä+ç +à+å+¬+¼+º+¬ +à+å +¬+¿+ê+è+¿ +º+ä+à+å+¬+¼+º+¬");
      }
      setFormOpen(false);
      reload();
    } catch (err: any) {
      console.error(err);
      toast.error("+¬+¦+¦+¦ +º+ä+¡+ü++: " + (err?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: Category) => {
    const { error } = await db().update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) toast.error("+¬+¦+¦+¦ +º+ä+¬+¡+»+è+½");
    reload();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= categories.length) return;
    const reordered = [...categories];
    [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!];
    // Re-number everything so order stays consistent even if old values collided.
    const results = await Promise.all(
      reordered.map((c, i) =>
        db()
          .update({ sort_order: i + 1 })
          .eq("id", c.id),
      ),
    );
    if (results.some((r: any) => r.error)) toast.error("+¬+¦+¦+¦ +¡+ü++ +º+ä+¬+¦+¬+è+¿");
    reload();
  };

  const remove = async (c: Category) => {
    const count = countIn(c.id);
    if (count > 0) {
      toast.error(
        `+ä+º +è+à+â+å +¡+¦+ü "${c.name}" +ä+ú+å +ü+è+ç ${count} +à+å+¬+¼. +º+å+é+ä +º+ä+à+å+¬+¼+º+¬ +ä+é+¦+à +ó+«+¦ +ú+ê+ä+º+ï +ú+ê +ú+«+ü+É +º+ä+é+¦+à.`,
      );
      return;
    }
    if (!confirm(`+¡+¦+ü +é+¦+à "${c.name}" +å+ç+º+ª+è+º+ï+ƒ`)) return;
    const { error } = await db().delete().eq("id", c.id);
    if (error) {
      toast.error("+¬+¦+¦+¦ +º+ä+¡+¦+ü");
      return;
    }
    toast.success("+¬+à +¡+¦+ü +º+ä+é+¦+à");
    reload();
  };

  return (
    <div className="space-y-5">
      {tableMissing && (
        <div className="rounded-3xl border border-amber-300 bg-amber-50 p-5 text-xs leading-6 text-amber-900">
          <div className="font-extrabold">+¼+»+ê+ä +º+ä+ú+é+¦+º+à +¦+è+¦ +à+ê+¼+ê+» +ü+è +é+º+¦+»+¬ +º+ä+¿+è+º+å+º+¬ +¿+¦+»</div>
          +è+¦+¦+¦ +º+ä+à+¬+¼+¦ +¡+º+ä+è+º+ï +º+ä+ú+é+¦+º+à +º+ä+º+ü+¬+¦+º+¦+è+¬. +ä+¬+ü+¦+è+ä +Ñ+»+º+¦+¬ +º+ä+ú+é+¦+º+à +¦+¦+æ+ä +à+ä+ü
          <code className="mx-1 rounded bg-amber-100 px-1.5 py-0.5" dir="ltr">
            supabase/migrations/20261006000000_categories.sql
          </code>
          +à+å SQL Editor +ü+è Supabase.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border bg-card p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-extrabold text-primary">+ú+é+¦+º+à +º+ä+à+¬+¼+¦</h2>
          <p className="text-xs text-muted-foreground">
            +â+ä +é+¦+à +++º+ç+¦ +ê+ü+è+ç +à+å+¬+¼+º+¬ +è+++ç+¦ +â+¦+ü +ú+ü+é+è +ü+è +º+ä+¦+ü+¡+¬ +º+ä+¦+ª+è+¦+è+¬ +¿+å+ü+¦ +ç+¦+º +º+ä+¬+¦+¬+è+¿.
          </p>
        </div>
        <button
          onClick={openAdd}
          disabled={tableMissing}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-md disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> +Ñ+¦+º+ü+¬ +é+¦+à
        </button>
      </div>

      {formOpen && (
        <form onSubmit={save} className="space-y-4 rounded-3xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-primary">
              {editing ? `+¬+¦+»+è+ä: ${editing.name}` : "+é+¦+à +¼+»+è+»"}
            </h3>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-full p-1.5 hover:bg-muted"
              aria-label="+Ñ+¦+ä+º+é"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold text-muted-foreground">
                +º+¦+à +º+ä+é+¦+à (+º+ä+¦+å+ê+º+å +ü+è +º+ä+¦+ª+è+¦+è+¬) *
              </span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="+à+½+º+ä: +à+¡+º+¦+è+ä +ü+º+«+¦+¬"
                className="w-full rounded-2xl border bg-background px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-muted-foreground">
                +º+ä+à+¦+¦+æ+ü +¿+º+ä+Ñ+å+¼+ä+è+¦+è (+è+++ç+¦ +ü+è +º+ä+¦+º+¿++) {editing ? "GÇö +ä+º +è+à+â+å +¬+¦+è+è+¦+ç" : "GÇö +º+«+¬+è+º+¦+è"}
              </span>
              <input
                value={form.id}
                disabled={!!editing}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                placeholder="premium-coffee"
                dir="ltr"
                className="w-full rounded-2xl border bg-background px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-2xl border bg-muted">
              {form.image ? (
                <img src={form.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-muted-foreground">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border bg-background px-4 py-2 text-xs font-bold text-primary hover:bg-muted">
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "+¼+º+¦+É +º+ä+¦+ü+¦GÇª" : "+¦+ü+¦ +¦+ê+¦+¬ +º+ä+é+¦+à"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadImage(f);
                }}
              />
            </label>
            {form.image && (
              <button
                type="button"
                onClick={() => setForm({ ...form, image: "" })}
                className="text-xs font-bold text-destructive hover:underline"
              >
                +Ñ+¦+º+ä+¬ +º+ä+¦+ê+¦+¬
              </button>
            )}
            <label className="ms-auto flex cursor-pointer items-center gap-2 text-xs font-bold">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              +++º+ç+¦ +ü+è +º+ä+à+¬+¼+¦
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-full border px-5 py-2.5 text-xs font-bold hover:bg-muted"
            >
              +Ñ+ä+¦+º+í
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
            >
              {saving ? "+¼+º+¦+É +º+ä+¡+ü++GÇª" : "+¡+ü++ +º+ä+é+¦+à"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        {categories.map((c, i) => {
          const count = countIn(c.id);
          return (
            <div
              key={c.id}
              className={`flex flex-wrap items-center gap-3 border-b p-4 last:border-b-0 ${
                c.is_active ? "" : "opacity-60"
              }`}
            >
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0 || tableMissing}
                  className="grid h-6 w-6 place-items-center rounded-md border hover:bg-muted disabled:opacity-30"
                  aria-label="+¬+¡+¦+è+â +ä+ú+¦+ä+ë"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === categories.length - 1 || tableMissing}
                  className="grid h-6 w-6 place-items-center rounded-md border hover:bg-muted disabled:opacity-30"
                  aria-label="+¬+¡+¦+è+â +ä+ú+¦+ü+ä"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border bg-muted">
                {c.image ? (
                  <img src={c.image} alt={c.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-muted-foreground">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-primary">{c.name}</div>
                <div className="text-[11px] text-muted-foreground" dir="ltr">
                  {c.id}
                </div>
              </div>

              <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold">
                {count} +à+å+¬+¼
              </span>
              {c.is_active && count === 0 && (
                <span className="rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-bold text-amber-700">
                  +ä+å +è+++ç+¦ +ü+è +º+ä+¦+ª+è+¦+è+¬ (+¿+»+ê+å +à+å+¬+¼+º+¬)
                </span>
              )}

              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleActive(c)}
                  disabled={tableMissing}
                  className="grid h-8 w-8 place-items-center rounded-full border hover:bg-muted disabled:opacity-40"
                  title={c.is_active ? "+Ñ+«+ü+º+í" : "+Ñ+++ç+º+¦"}
                >
                  {c.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => openEdit(c)}
                  disabled={tableMissing}
                  className="grid h-8 w-8 place-items-center rounded-full border text-primary hover:bg-muted disabled:opacity-40"
                  title="+¬+¦+»+è+ä"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => remove(c)}
                  disabled={tableMissing}
                  className="grid h-8 w-8 place-items-center rounded-full border text-destructive hover:bg-destructive/10 disabled:opacity-40"
                  title="+¡+¦+ü"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
        {categories.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            +ä+º +¬+ê+¼+» +ú+é+¦+º+à +¿+¦+» GÇö +º+¦+¦++ "+Ñ+¦+º+ü+¬ +é+¦+à".
          </div>
        )}
      </div>
    </div>
  );
}
