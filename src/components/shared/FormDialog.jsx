import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FormDialog({ open, onClose, title, fields = [], data, onChange, onSubmit, isLoading }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-2">
          {fields.map(field => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-sm font-medium">{field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}</Label>
              {field.type === "select" ? (
                <Select value={data[field.key] || ""} onValueChange={v => onChange(field.key, v)}>
                  <SelectTrigger><SelectValue placeholder={`Selecione...`} /></SelectTrigger>
                  <SelectContent>
                    {field.options?.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "textarea" ? (
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  value={data[field.key] || ""}
                  onChange={e => onChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              ) : field.type === "checkbox" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={field.key}
                    checked={!!data[field.key]}
                    onChange={e => onChange(field.key, e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <label htmlFor={field.key} className="text-sm text-muted-foreground">{field.checkLabel || field.label}</label>
                </div>
              ) : (
                <Input
                  type={field.type || "text"}
                  value={data[field.key] || ""}
                  onChange={e => onChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              )}
              {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
            </div>
          ))}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}